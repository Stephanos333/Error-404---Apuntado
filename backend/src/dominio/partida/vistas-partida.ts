/**
 * Vistas filtradas de la partida (ADR-05, R04 anti-trampas).
 *
 * - Vista PÚBLICA, para la sala `partida:{id}`: estado general, tamaño de cada mano,
 *   carta del tope del pozo de descarte, turno actual y marcador. Nunca incluye las cartas
 *   de las manos ni el contenido del mazo.
 * - Vista PRIVADA, para la sala `usuario:{id}`: únicamente la mano de ese jugador.
 */
import { CartaPartida, EstadoJugadorPartida, EstadoPartida, EstadoRonda, FaseTurno, Partida } from './partida';

export interface JugadorVistaPublica {
	jugadorId: string;
	nombreUsuario: string;
	posicion: number;
	estado: EstadoJugadorPartida;
	puntaje: number;
	conectado: boolean;
	/** Solo el tamaño de la mano, nunca sus cartas. */
	cartasEnMano: number;
}

export interface RondaVistaPublica {
	numero: number;
	estado: EstadoRonda;
	turno: { jugadorId: string; fase: FaseTurno; intentoCierre: boolean; numero: number };
	/** Solo la cantidad de cartas del mazo, nunca su contenido ni su orden. */
	cartasEnMazo: number;
	cartasEnDescarte: number;
	topeDescarte: CartaPartida | null;
}

export interface VistaPublicaPartida {
	partidaId: string;
	version: number;
	estado: EstadoPartida;
	modalidad: string;
	ganadorId: string | null;
	pozo: { total: number };
	jugadores: JugadorVistaPublica[];
	ronda: RondaVistaPublica | null;
	marcador: Array<{ numeroRonda: number; ganadorId: string; tipoCierre: string; puntos: Array<{ jugadorId: string; puntosRonda: number; acumulado: number; eliminado: boolean }> }>;
}

export interface VistaPrivadaPartida {
	partidaId: string;
	version: number;
	jugadorId: string;
	cartas: CartaPartida[];
	grupos: number[][];
}

const copiarCarta = (c: CartaPartida): CartaPartida => ({ valor: c.valor, palo: c.palo, baraja: c.baraja });

/**
 * Vista pública: la puede recibir cualquier jugador de la sala.
 * @param {Partida} partida La partida.
 * @returns {VistaPublicaPartida} La vista sin cartas privadas.
 */
export function vistaPublica(partida: Partida): VistaPublicaPartida {
	const ronda = partida.rondaActual;
	const tamanoMano = (jugadorId: string): number => ronda?.manos.find((m) => m.jugadorId === jugadorId)?.cartas.length ?? 0;
	const tope = ronda?.pozoDescarte[ronda.pozoDescarte.length - 1];
	return {
		partidaId: partida._id,
		version: partida.version,
		estado: partida.estado,
		modalidad: partida.configuracion.modalidad,
		ganadorId: partida.ganadorId,
		pozo: { total: partida.pozo.total },
		jugadores: partida.jugadores.map((j) => ({
			jugadorId: j.jugadorId,
			nombreUsuario: j.nombreUsuario,
			posicion: j.posicion,
			estado: j.estado,
			puntaje: j.puntaje,
			conectado: j.conectado,
			cartasEnMano: tamanoMano(j.jugadorId),
		})),
		ronda: ronda
			? {
				numero: ronda.numero,
				estado: ronda.estado,
				turno: { ...ronda.turno },
				cartasEnMazo: ronda.mazo.length,
				cartasEnDescarte: ronda.pozoDescarte.length,
				topeDescarte: tope ? copiarCarta(tope) : null,
			}
			: null,
		marcador: partida.marcador.map((e) => ({
			numeroRonda: e.numeroRonda,
			ganadorId: e.ganadorId,
			tipoCierre: e.tipoCierre,
			puntos: e.puntos.map((p) => ({ jugadorId: p.jugadorId, puntosRonda: p.puntosRonda, acumulado: p.acumulado, eliminado: p.eliminado })),
		})),
	};
}

/**
 * Vista privada: la mano de UN jugador. Devuelve `null` si el jugador no tiene mano.
 * @param {Partida} partida La partida.
 * @param {string} jugadorId El jugador dueño de la mano.
 * @returns {VistaPrivadaPartida | null} Su mano.
 */
export function vistaPrivada(partida: Partida, jugadorId: string): VistaPrivadaPartida | null {
	const mano = partida.rondaActual?.manos.find((m) => m.jugadorId === jugadorId);
	if (!mano) return null;
	return {
		partidaId: partida._id,
		version: partida.version,
		jugadorId,
		cartas: mano.cartas.map(copiarCarta),
		grupos: mano.grupos.map((g) => [...g]),
	};
}
