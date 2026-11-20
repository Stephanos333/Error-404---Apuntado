/**
 * Transiciones puras del agregado Partida (ADR-04, ADR-05).
 *
 * Cada comando recibe el estado actual y devuelve un estado NUEVO (no muta la entrada)
 * junto con los eventos de dominio que se publicarán después del commit. Toda la
 * validación del cierre, la liquidación y el desenlace se calculan aquí, en memoria,
 * antes de escribir en la base de datos (§2.4). La regla de la modalidad llega por el
 * contrato `ReglaJuegoPlugin`; este módulo no conoce plug-ins concretos.
 *
 * Ninguna función supera complejidad ciclomática 10 (FF-04).
 */
import {
	ConfiguracionReparto,
	Desenlace,
	ManoDeclarada,
	ManoRival,
	ReglaJuegoPlugin,
	TipoCierre,
} from '../../reglas/contrato/regla-juego.plugin';
import { ExceptionMessagesConstants as M } from '../../shared/exceptions/exception-messages.constants';
import { Barajador, aCartaContrato, crearMazo } from './cartas-partida';
import {
	AportePozo,
	CartaPartida,
	ConfiguracionPartida,
	EntradaMarcador,
	FaseTurno,
	JugadorPartida,
	ManoJugador,
	OrigenRobo,
	Partida,
	RondaPartida,
} from './partida';
import { PartidaConflictException, PartidaInvalidaException } from './partida.exceptions';

/** Tipos de eventos de dominio de la partida (se publican después del commit). */
export type TipoEventoPartida =
	| 'PARTIDA_INICIADA'
	| 'CARTA_ROBADA'
	| 'TURNO_CAMBIADO'
	| 'CIERRE_FALLIDO'
	| 'JUGADOR_TOCO'
	| 'RONDA_CERRADA'
	| 'RONDA_INICIADA'
	| 'PARTIDA_FINALIZADA';

/**
 * Evento de dominio. `detalle` solo lleva información pública: nunca la mano de un
 * jugador ni el contenido del mazo (R04).
 */
export interface EventoPartida {
	readonly tipo: TipoEventoPartida;
	readonly jugadorId?: string;
	readonly detalle: Readonly<Record<string, unknown>>;
}

/** Resultado de aplicar un comando. */
export interface ResultadoTransicion {
	readonly partida: Partida;
	readonly eventos: EventoPartida[];
	/** La partida terminó: hay que pagar el pozo en la misma transacción. */
	readonly finalizada: boolean;
}

/** Datos para crear el agregado al iniciar la partida. */
export interface DatosNuevaPartida {
	id: string;
	codigoInvitacion: string;
	nombre: string;
	anfitrionId: string;
	configuracion: ConfiguracionPartida;
	jugadores: Array<Pick<JugadorPartida, 'jugadorId' | 'usuarioId' | 'nombreUsuario' | 'posicion'>>;
	aportes: AportePozo[];
	ahora: Date;
}

/** Regla de la partida y dependencias que necesita un comando que puede cerrar la ronda. */
export interface ContextoRegla {
	regla: ReglaJuegoPlugin;
	barajador: Barajador;
	ahora: Date;
}

/** Datos del intento de cierre. */
export interface DatosCierre {
	tipo: TipoCierre;
	/** Índices de la mano actual (11 cartas) por grupo. */
	grupos: unknown;
	/** Índice de la carta que se descarta al cerrar. */
	descarte: number;
}

/** Cantidad máxima de grupos y de cartas por grupo (esquema `manos.grupos`). */
const MAXIMO_GRUPOS = 4;
const MAXIMO_CARTAS_POR_GRUPO = 4;

const clonar = (partida: Partida): Partida => structuredClone(partida);

/** Jugadores que siguen en juego, ordenados por posición. */
export function jugadoresActivos(partida: Partida): JugadorPartida[] {
	return partida.jugadores.filter((j) => j.estado === 'ACTIVO').sort((a, b) => a.posicion - b.posicion);
}

/** Jugador de la partida. */
function jugador(partida: Partida, jugadorId: string): JugadorPartida {
	const encontrado = partida.jugadores.find((j) => j.jugadorId === jugadorId);
	if (!encontrado) throw new PartidaInvalidaException(M.JUGADOR_NO_PERTENECE_A_LA_PARTIDA);
	return encontrado;
}

/** Mano de un jugador en la ronda. */
function manoDe(ronda: RondaPartida, jugadorId: string): ManoJugador {
	const mano = ronda.manos.find((m) => m.jugadorId === jugadorId);
	if (!mano) throw new PartidaInvalidaException(M.JUGADOR_NO_PERTENECE_A_LA_PARTIDA);
	return mano;
}

/** Estados de la ronda en los que se aceptan comandos de turno. */
const ESTADOS_CON_TURNOS: ReadonlyArray<RondaPartida['estado']> = ['EN_TURNOS', 'RONDA_EXTRA'];

/**
 * La ronda actual admite comandos de turno (turnos normales o ronda extra tras tocar).
 * @throws {PartidaConflictException} RONDA_YA_CERRADA si la partida o la ronda ya se cerraron.
 */
export function rondaEnTurnos(partida: Partida): RondaPartida {
	const ronda = partida.rondaActual;
	if (partida.estado !== 'EN_JUEGO' || !ronda || !ESTADOS_CON_TURNOS.includes(ronda.estado)) {
		throw new PartidaConflictException(M.RONDA_YA_CERRADA);
	}
	return ronda;
}

/**
 * El jugador tiene el turno.
 * @throws {PartidaConflictException} RONDA_YA_CERRADA o TURNO_NO_CORRESPONDE.
 */
export function verificarTurno(partida: Partida, jugadorId: string): RondaPartida {
	const ronda = rondaEnTurnos(partida);
	if (ronda.turno.jugadorId !== jugadorId) throw new PartidaConflictException(M.TURNO_NO_CORRESPONDE);
	return ronda;
}

function exigirFase(ronda: RondaPartida, fase: FaseTurno): void {
	if (ronda.turno.fase !== fase) throw new PartidaInvalidaException(M.FASE_DE_TURNO_INVALIDA);
}

function exigirIndice(mano: ManoJugador, indice: number): void {
	if (!Number.isInteger(indice) || indice < 0 || indice >= mano.cartas.length) {
		throw new PartidaInvalidaException(M.CARTA_NO_ESTA_EN_LA_MANO);
	}
}

/** Un grupo es un arreglo de 1 a 4 índices enteros dentro de la mano. */
function esGrupoBienFormado(grupo: unknown, tamanoMano: number): grupo is number[] {
	if (!Array.isArray(grupo) || grupo.length === 0 || grupo.length > MAXIMO_CARTAS_POR_GRUPO) return false;
	return grupo.every((i) => Number.isInteger(i) && i >= 0 && i < tamanoMano);
}

/**
 * Valida la organización enviada por el cliente: hasta 4 grupos, índices válidos, sin
 * repetir cartas y sin incluir las cartas excluidas (p. ej. la de descarte).
 * @throws {PartidaInvalidaException} GRUPOS_INVALIDOS.
 */
export function validarGrupos(grupos: unknown, tamanoMano: number, excluidos: number[]): number[][] {
	if (!Array.isArray(grupos) || grupos.length > MAXIMO_GRUPOS) throw new PartidaInvalidaException(M.GRUPOS_INVALIDOS);
	if (!grupos.every((g) => esGrupoBienFormado(g, tamanoMano))) throw new PartidaInvalidaException(M.GRUPOS_INVALIDOS);
	const indices = (grupos as number[][]).flat();
	if (new Set(indices).size !== indices.length || indices.some((i) => excluidos.includes(i))) {
		throw new PartidaInvalidaException(M.GRUPOS_INVALIDOS);
	}
	return (grupos as number[][]).map((g) => [...g]);
}

/** Ajusta los índices de los grupos después de quitar una carta de la mano. */
export function reindexarSinCarta(grupos: number[][], quitada: number): number[][] {
	return grupos
		.map((g) => g.filter((i) => i !== quitada).map((i) => (i > quitada ? i - 1 : i)))
		.filter((g) => g.length > 0);
}

/** Cartas de la mano que no están en ningún grupo ni en las excluidas. */
function sobrantes(cartas: CartaPartida[], grupos: number[][], excluidos: number[]): CartaPartida[] {
	const usados = new Set([...grupos.flat(), ...excluidos]);
	return cartas.filter((_, i) => !usados.has(i));
}

/** Mano que declara quien intenta cerrar, en el lenguaje del contrato. */
function manoDeclarada(cartas: CartaPartida[], grupos: number[][], descarte: number): ManoDeclarada {
	return {
		grupos: grupos.map((g) => g.map((i) => aCartaContrato(cartas[i]))),
		sobrantes: sobrantes(cartas, grupos, [descarte]).map(aCartaContrato),
		descarte: aCartaContrato(cartas[descarte]),
	};
}

/** Mano de un rival tal como la tenía organizada: define su penalización (RD-24). */
function manoRival(mano: ManoJugador): ManoRival {
	return {
		jugadorId: mano.jugadorId,
		grupos: mano.grupos.map((g) => g.map((i) => aCartaContrato(mano.cartas[i]))),
		sobrantes: sobrantes(mano.cartas, mano.grupos, []).map(aCartaContrato),
	};
}

/** Siguiente jugador activo después de una posición (circular). */
function siguienteActivo(partida: Partida, posicion: number): JugadorPartida {
	const activos = jugadoresActivos(partida);
	return activos.find((j) => j.posicion > posicion) ?? activos[0];
}

/** Jugadores activos en orden de turno a partir del siguiente a una posición, sin incluirla. */
function ordenDesde(partida: Partida, posicion: number): JugadorPartida[] {
	const activos = jugadoresActivos(partida);
	return [...activos.filter((j) => j.posicion > posicion), ...activos.filter((j) => j.posicion < posicion)];
}

/**
 * Reparte una ronda nueva entre los jugadores activos. Se usa doble baraja desde
 * `jugadoresDobleBaraja` jugadores (PS-08). El jugador inicial recibe una carta más y
 * empieza descartando o cerrando.
 */
export function repartirRonda(
	partida: Partida,
	numero: number,
	posicionInicial: number,
	reparto: ConfiguracionReparto,
	barajador: Barajador,
): RondaPartida {
	const activos = jugadoresActivos(partida);
	const barajas = activos.length >= partida.configuracion.parametros.jugadoresDobleBaraja ? 2 : 1;
	const mazo = barajador.barajar(crearMazo(barajas));
	const inicial = activos.find((j) => j.posicion === posicionInicial) ?? activos[0];
	const manos: ManoJugador[] = activos.map((j) => ({
		jugadorId: j.jugadorId,
		cartas: mazo.splice(0, j === inicial ? reparto.cartasJugadorInicial : reparto.cartasPorJugador),
		grupos: [],
	}));
	return {
		numero,
		estado: 'EN_TURNOS',
		posicionInicial: inicial.posicion,
		turno: { jugadorId: inicial.jugadorId, fase: 'CON_11_CARTAS', intentoCierre: false, numero: 1 },
		mazo,
		pozoDescarte: [],
		manos,
		rondaExtra: null,
	};
}

/**
 * Crea el agregado con la primera ronda repartida.
 */
export function crearPartida(datos: DatosNuevaPartida, reparto: ConfiguracionReparto, barajador: Barajador): ResultadoTransicion {
	const jugadores: JugadorPartida[] = [...datos.jugadores]
		.sort((a, b) => a.posicion - b.posicion)
		.map((j) => ({ ...j, estado: 'ACTIVO', puntaje: 0, usoReenganche: false, conectado: true, desconectadoDesde: null }));
	const partida: Partida = {
		_id: datos.id,
		codigoInvitacion: datos.codigoInvitacion,
		nombre: datos.nombre,
		estado: 'EN_JUEGO',
		anfitrionId: datos.anfitrionId,
		configuracion: datos.configuracion,
		jugadores,
		pozo: { total: datos.aportes.reduce((s, a) => s + a.monto, 0), aportes: datos.aportes },
		rondaActual: null,
		marcador: [],
		ganadorId: null,
		ventanaHasta: null,
		comandosRecientes: [],
		version: 0,
		creadaEn: datos.ahora,
		actualizadaEn: datos.ahora,
		finalizadaEn: null,
	};
	partida.rondaActual = repartirRonda(partida, 1, jugadores[0].posicion, reparto, barajador);
	return { partida, eventos: [{ tipo: 'PARTIDA_INICIADA', detalle: { numeroRonda: 1 } }], finalizada: false };
}

function robarDelDescarte(ronda: RondaPartida): { carta: CartaPartida; mazoRellenado: boolean } {
	const carta = ronda.pozoDescarte.pop();
	if (!carta) throw new PartidaInvalidaException(M.POZO_DESCARTE_VACIO);
	return { carta, mazoRellenado: false };
}

/** Si el mazo se acaba se rebaraja el pozo de descarte, conservando la carta del tope. */
function robarDelMazo(ronda: RondaPartida, barajador: Barajador): { carta: CartaPartida; mazoRellenado: boolean } {
	let mazoRellenado = false;
	if (ronda.mazo.length === 0) {
		const tope = ronda.pozoDescarte.pop();
		ronda.mazo = barajador.barajar(ronda.pozoDescarte);
		ronda.pozoDescarte = tope ? [tope] : [];
		mazoRellenado = true;
	}
	const carta = ronda.mazo.shift();
	if (!carta) throw new PartidaInvalidaException(M.MAZO_VACIO);
	return { carta, mazoRellenado };
}

/**
 * Comando robar: el jugador en turno toma una carta del mazo o del pozo de descarte.
 */
export function robar(actual: Partida, jugadorId: string, origen: OrigenRobo, barajador: Barajador): ResultadoTransicion {
	const partida = clonar(actual);
	const ronda = verificarTurno(partida, jugadorId);
	exigirFase(ronda, 'ESPERANDO_ROBO');
	const { carta, mazoRellenado } = origen === 'DESCARTE' ? robarDelDescarte(ronda) : robarDelMazo(ronda, barajador);
	manoDe(ronda, jugadorId).cartas.push(carta);
	ronda.turno.fase = 'CON_11_CARTAS';
	return { partida, eventos: [{ tipo: 'CARTA_ROBADA', jugadorId, detalle: { origen, mazoRellenado } }], finalizada: false };
}

/**
 * Comando descartar: el jugador deja una carta en el pozo y el turno pasa al siguiente.
 * Puede enviar su organización de grupos (índices de la mano actual, sin la descartada).
 * En la ronda extra (tras tocar), el último descarte pendiente liquida la ronda.
 */
export function descartar(
	actual: Partida,
	jugadorId: string,
	indice: number,
	grupos: unknown,
	contexto: ContextoRegla,
): ResultadoTransicion {
	const partida = clonar(actual);
	const ronda = verificarTurno(partida, jugadorId);
	exigirFase(ronda, 'CON_11_CARTAS');
	const mano = manoDe(ronda, jugadorId);
	exigirIndice(mano, indice);
	const organizacion = grupos === undefined ? mano.grupos.map((g) => g.filter((i) => i !== indice)) : validarGrupos(grupos, mano.cartas.length, [indice]);
	const [carta] = mano.cartas.splice(indice, 1);
	ronda.pozoDescarte.push(carta);
	mano.grupos = reindexarSinCarta(organizacion, indice);
	if (ronda.estado === 'RONDA_EXTRA') return avanzarRondaExtra(partida, ronda, jugadorId, carta, contexto);
	const siguiente = siguienteActivo(partida, jugador(partida, jugadorId).posicion);
	ronda.turno = { jugadorId: siguiente.jugadorId, fase: 'ESPERANDO_ROBO', intentoCierre: false, numero: ronda.turno.numero + 1 };
	return {
		partida,
		eventos: [{ tipo: 'TURNO_CAMBIADO', jugadorId, detalle: { descarte: { ...carta }, siguienteJugadorId: siguiente.jugadorId } }],
		finalizada: false,
	};
}

/**
 * El tipo de cierre lo admite la regla y la ronda: durante la ronda extra no se puede volver a tocar.
 * @throws {PartidaInvalidaException} CIERRE_NO_PERMITIDO.
 */
function exigirCierrePermitido(regla: ReglaJuegoPlugin, ronda: RondaPartida, tipo: TipoCierre): void {
	const tocarEnRondaExtra = ronda.estado === 'RONDA_EXTRA' && tipo === 'TOCAR';
	if (!regla.cierresPermitidos().includes(tipo) || tocarEnRondaExtra) throw new PartidaInvalidaException(M.CIERRE_NO_PERMITIDO);
}

/**
 * Comando intentar cierre: valida con la regla, y si el cierre es válido liquida la
 * ronda y evalúa el desenlace en memoria, en el mismo cálculo (§2.4). Tocar abre la
 * ronda extra: los demás juegan un último turno y la ronda se liquida al terminar.
 */
export function intentarCierre(actual: Partida, jugadorId: string, datos: DatosCierre, contexto: ContextoRegla): ResultadoTransicion {
	const { regla } = contexto;
	const partida = clonar(actual);
	const ronda = verificarTurno(partida, jugadorId);
	exigirFase(ronda, 'CON_11_CARTAS');
	if (ronda.turno.intentoCierre) throw new PartidaInvalidaException(M.YA_INTENTO_CIERRE_EN_EL_TURNO);
	exigirCierrePermitido(regla, ronda, datos.tipo);
	const mano = manoDe(ronda, jugadorId);
	exigirIndice(mano, datos.descarte);
	const grupos = validarGrupos(datos.grupos, mano.cartas.length, [datos.descarte]);
	const resultado = regla.validarCierre(manoDeclarada(mano.cartas, grupos, datos.descarte), datos.tipo);
	const efecto = regla.efectoCierre(resultado, datos.tipo);
	const cerrador = jugador(partida, jugadorId);
	cerrador.puntaje += efecto.ajustePuntos;
	if (efecto.rondaExtra) return iniciarRondaExtra(partida, ronda, { jugadorId, descarte: datos.descarte, grupos });
	if (!efecto.terminaRonda) {
		ronda.turno.intentoCierre = true;
		const detalle = { motivo: resultado.motivo ?? null, ajustePuntos: efecto.ajustePuntos, puntaje: cerrador.puntaje };
		return { partida, eventos: [{ tipo: 'CIERRE_FALLIDO', jugadorId, detalle }], finalizada: false };
	}
	mano.grupos = grupos;
	return cerrarRonda(partida, ronda, { jugadorId, descarte: datos.descarte, tipo: datos.tipo, ajuste: efecto.ajustePuntos }, contexto);
}

interface CierreValido {
	jugadorId: string;
	descarte: number;
	tipo: TipoCierre;
	ajuste: number;
}

/** Quien gana la ronda y con qué tipo de cierre. */
interface GanadorRonda {
	jugadorId: string;
	tipo: TipoCierre;
}

/** Saca de la mano la carta de descarte, la deja en el pozo y ajusta los grupos. */
function descartarAlCerrar(ronda: RondaPartida, jugadorId: string, descarte: number): CartaPartida {
	const mano = manoDe(ronda, jugadorId);
	const [carta] = mano.cartas.splice(descarte, 1);
	ronda.pozoDescarte.push(carta);
	mano.grupos = reindexarSinCarta(mano.grupos, descarte);
	return carta;
}

/**
 * Tocar válido: el tocador descarta y los demás jugadores activos, en orden de turno,
 * juegan un último turno (ronda extra) antes de liquidar.
 */
function iniciarRondaExtra(
	partida: Partida,
	ronda: RondaPartida,
	toque: { jugadorId: string; descarte: number; grupos: number[][] },
): ResultadoTransicion {
	manoDe(ronda, toque.jugadorId).grupos = toque.grupos;
	const carta = descartarAlCerrar(ronda, toque.jugadorId, toque.descarte);
	const pendientes = ordenDesde(partida, jugador(partida, toque.jugadorId).posicion).map((j) => j.jugadorId);
	ronda.estado = 'RONDA_EXTRA';
	ronda.rondaExtra = { tocadorId: toque.jugadorId, pendientes };
	ronda.turno = { jugadorId: pendientes[0], fase: 'ESPERANDO_ROBO', intentoCierre: false, numero: ronda.turno.numero + 1 };
	return {
		partida,
		eventos: [{ tipo: 'JUGADOR_TOCO', jugadorId: toque.jugadorId, detalle: { descarte: { ...carta }, pendientes: [...pendientes] } }],
		finalizada: false,
	};
}

/** Un jugador terminó su turno extra: pasa al siguiente pendiente o, si no queda ninguno, se liquida. */
function avanzarRondaExtra(
	partida: Partida,
	ronda: RondaPartida,
	jugadorId: string,
	carta: CartaPartida,
	contexto: ContextoRegla,
): ResultadoTransicion {
	const extra = ronda.rondaExtra;
	extra.pendientes = extra.pendientes.filter((id) => id !== jugadorId);
	const siguienteJugadorId = extra.pendientes[0] ?? null;
	const turno: EventoPartida = { tipo: 'TURNO_CAMBIADO', jugadorId, detalle: { descarte: { ...carta }, siguienteJugadorId } };
	if (siguienteJugadorId) {
		ronda.turno = { jugadorId: siguienteJugadorId, fase: 'ESPERANDO_ROBO', intentoCierre: false, numero: ronda.turno.numero + 1 };
		return { partida, eventos: [turno], finalizada: false };
	}
	// Fin de la ronda extra: todos (incluido el tocador, por su sobrante) liquidan su mano organizada.
	const participantes = jugadoresActivos(partida);
	const { penalizaciones } = contexto.regla.liquidarRonda(participantes.map((j) => manoRival(manoDe(ronda, j.jugadorId))));
	participantes.forEach((j) => (j.puntaje += penalizaciones[j.jugadorId] ?? 0));
	return concluirRonda(partida, ronda, { jugadorId: extra.tocadorId, tipo: 'TOCAR' }, { ...penalizaciones }, contexto, [turno]);
}

/** Cierre 4-3-3: el cerrador descarta y cada rival liquida su mano organizada. */
function cerrarRonda(partida: Partida, ronda: RondaPartida, cierre: CierreValido, contexto: ContextoRegla): ResultadoTransicion {
	const descarte = descartarAlCerrar(ronda, cierre.jugadorId, cierre.descarte);
	const rivales = jugadoresActivos(partida).filter((j) => j.jugadorId !== cierre.jugadorId);
	const { penalizaciones } = contexto.regla.liquidarRonda(rivales.map((j) => manoRival(manoDe(ronda, j.jugadorId))));
	rivales.forEach((j) => (j.puntaje += penalizaciones[j.jugadorId] ?? 0));
	const puntosRonda = { ...penalizaciones, [cierre.jugadorId]: cierre.ajuste };
	return concluirRonda(partida, ronda, { jugadorId: cierre.jugadorId, tipo: cierre.tipo }, puntosRonda, contexto, [], descarte);
}

/**
 * Evalúa el desenlace con la regla, registra el marcador (multironda) y reparte la
 * siguiente ronda o finaliza la partida. Todo en el mismo cálculo en memoria.
 */
function concluirRonda(
	partida: Partida,
	ronda: RondaPartida,
	ganador: GanadorRonda,
	puntosRonda: Record<string, number>,
	contexto: ContextoRegla,
	eventosPrevios: EventoPartida[],
	descarte?: CartaPartida,
): ResultadoTransicion {
	const { regla, barajador, ahora } = contexto;
	const participantes = jugadoresActivos(partida);
	const desenlace = regla.evaluarDesenlace(Object.fromEntries(participantes.map((j) => [j.jugadorId, j.puntaje])), ganador.jugadorId);
	// Si la partida termina en esta ronda, quienes salen quedan como PERDEDOR (ver `finalizar`).
	if (!desenlace.terminada) participantes.filter((j) => desenlace.eliminados.includes(j.jugadorId)).forEach((j) => (j.estado = 'ELIMINADO'));
	if (regla.descriptor.multironda) {
		partida.marcador.push(entradaMarcador(ronda.numero, ganador, participantes, puntosRonda, desenlace.eliminados, ahora));
	}
	ronda.estado = 'CERRADA';
	ronda.rondaExtra = null;
	const eventoCierre: EventoPartida = {
		tipo: 'RONDA_CERRADA',
		jugadorId: ganador.jugadorId,
		detalle: {
			numeroRonda: ronda.numero,
			tipoCierre: ganador.tipo,
			descarte: descarte ? { ...descarte } : null,
			puntosRonda,
			eliminados: [...desenlace.eliminados],
		},
	};
	const eventos = [...eventosPrevios, eventoCierre];
	if (desenlace.terminada) return finalizar(partida, desenlace, ganador.jugadorId, ahora, eventos);
	const siguiente = siguienteActivo(partida, ronda.posicionInicial);
	partida.rondaActual = repartirRonda(partida, ronda.numero + 1, siguiente.posicion, regla.configuracionReparto(), barajador);
	return { partida, eventos: [...eventos, { tipo: 'RONDA_INICIADA', detalle: { numeroRonda: ronda.numero + 1 } }], finalizada: false };
}

function entradaMarcador(
	numeroRonda: number,
	ganador: GanadorRonda,
	participantes: JugadorPartida[],
	puntosRonda: Record<string, number>,
	eliminados: ReadonlyArray<string>,
	ahora: Date,
): EntradaMarcador {
	return {
		numeroRonda,
		ganadorId: ganador.jugadorId,
		tipoCierre: ganador.tipo,
		cerradaEn: ahora,
		puntos: participantes.map((j) => ({
			jugadorId: j.jugadorId,
			puntosRonda: puntosRonda[j.jugadorId] ?? 0,
			castigos: 0,
			acumulado: j.puntaje,
			eliminado: eliminados.includes(j.jugadorId),
			reenganchado: false,
		})),
	};
}

/** La partida termina: el ganador queda marcado y el resto pierde (los eliminados conservan su estado). */
function finalizar(partida: Partida, desenlace: Desenlace, cerradorId: string, ahora: Date, eventos: EventoPartida[]): ResultadoTransicion {
	const ganadorId = desenlace.ganadorId ?? cerradorId;
	partida.jugadores.forEach((j) => {
		j.estado = j.jugadorId === ganadorId ? 'GANADOR' : j.estado === 'ELIMINADO' ? 'ELIMINADO' : 'PERDEDOR';
	});
	partida.estado = 'FINALIZADA';
	partida.ganadorId = ganadorId;
	partida.finalizadaEn = ahora;
	eventos.push({ tipo: 'PARTIDA_FINALIZADA', jugadorId: ganadorId, detalle: { ganadorId, premio: partida.pozo.total } });
	return { partida, eventos, finalizada: true };
}
