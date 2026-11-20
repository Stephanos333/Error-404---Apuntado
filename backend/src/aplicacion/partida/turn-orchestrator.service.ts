import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { ClientSession, Model, Types } from 'mongoose';
import { randomInt } from 'node:crypto';
import { DatabaseConstants } from '../../database/database.constants';
import { AsientoTokensRecord, GameRecord, PlayerRecord, UserRecord } from '../../database/database.records';
import { PartidaRepository } from '../../database/partida.repository';
import { AsientosTokensRepository } from '../../database/asientos-tokens.repository';
import { UnidadDeTrabajo } from '../../database/unidad-de-trabajo';
import { RegistroReglas } from '../../reglas/registro/registro-reglas';
import { ReglaJuegoPlugin, TipoCierre } from '../../reglas/contrato/regla-juego.plugin';
import { Game } from '../../dominio/game/game';
import { GameStatusConstants } from '../../dominio/game/game-status.constants';
import { UserId } from '../../dominio/user/user-id';
import { UserStatusConstants } from '../../dominio/user/user-status.constants';
import { NotEnoughTokensException } from '../../dominio/user/exceptions/not-enough-tokens.exception';
import { MatchCannotBeStartedException } from '../../dominio/partida/match-cannot-be-started.exception';
import { OnlyGameHostCanStartTheMatchException } from '../../dominio/partida/only-game-host-can-start-the-match.exception';
import { AportePozo, ConfiguracionPartida, OrigenRobo, ParametrosPartida, Partida } from '../../dominio/partida/partida';
import { BARAJADOR, Barajador } from '../../dominio/partida/cartas-partida';
import {
	DatosNuevaPartida,
	ResultadoTransicion,
	crearPartida,
	descartar,
	intentarCierre,
	robar,
} from '../../dominio/partida/comandos-partida';
import { VistaPrivadaPartida, VistaPublicaPartida, vistaPrivada, vistaPublica } from '../../dominio/partida/vistas-partida';
import {
	PartidaConflictException,
	PartidaInvalidaException,
	PartidaNotFoundException,
} from '../../dominio/partida/partida.exceptions';
import { PartidaActualizadaEvent } from '../../dominio/events/partida/partida-actualizada.event';
import { ExceptionMessagesConstants as M } from '../../shared/exceptions/exception-messages.constants';
import { PARAMETROS_SISTEMA } from './parametros-sistema';
import { aDominio, aRegistro } from './partida.mapper';

/** Datos comunes de todo comando de turno (R03). */
export interface ComandoTurno {
	/** Juego (sala) del que se envía el comando; identifica la sala `partida:{salaId}`. */
	salaId: string;
	/** `_id` del agregado `partidas`. */
	partidaId: string;
	/** Usuario autenticado (JWT); es el `jugadorId` dentro de la partida. */
	usuarioId: string;
	/** Versión de la partida con la que el cliente envía el comando. */
	version: number;
	/** Identificador único del comando (idempotencia). */
	idComando: string;
}

/** Resultado de un comando de turno. */
export interface ResultadoComando {
	/** `false` si el comando ya se había aplicado (reenvío idempotente): no se repite el efecto. */
	aplicado: boolean;
	partida: Partida;
}

/** Estado de la partida que puede ver un usuario (RF-14, reconexión). */
export interface EstadoParaUsuario {
	publica: VistaPublicaPartida;
	privada: VistaPrivadaPartida | null;
}

/** Señal interna: la escritura condicional no coincidió (otro comando ganó la carrera). */
class EscrituraSinCoincidencia extends Error {}

const LONGITUD_CODIGO = 6;
const ALFABETO_CODIGO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NOMBRE_MINIMO = 3;
const NOMBRE_MAXIMO = 30;

/**
 * Orquestador de turnos (`TurnOrchestrator`, ADR-05): ruta síncrona del comando.
 *
 * 1. Lee el agregado `partidas` una vez.
 * 2. Calcula en memoria, con el plug-in de la partida, el nuevo estado: validación del
 *    cierre, liquidación y desenlace incluidos (§2.4).
 * 3. Lo persiste en UNA escritura atómica condicional (`version`, turno e `idComando`).
 *    Si el comando cruza agregados (cobro de apuestas, pago del pozo) usa una
 *    transacción `snapshot`/`majority`.
 * 4. Solo después del commit publica los eventos de dominio (persistir antes de notificar).
 *
 * No conoce Socket.IO ni ningún plug-in concreto.
 * @class
 */
@Injectable()
export class TurnOrchestrator {
	private readonly logger: Logger = new Logger(TurnOrchestrator.name);

	constructor(
		private readonly partidas: PartidaRepository,
		private readonly asientos: AsientosTokensRepository,
		private readonly unidadDeTrabajo: UnidadDeTrabajo,
		private readonly registroReglas: RegistroReglas,
		private readonly eventBus: EventBus,
		@Inject(BARAJADOR) private readonly barajador: Barajador,
		@Inject(PARAMETROS_SISTEMA) private readonly parametros: ParametrosPartida,
		@Inject(DatabaseConstants.USER_PROVIDER) private readonly usuarios: Model<UserRecord>,
		@Inject(DatabaseConstants.GAME_PROVIDER) private readonly juegos: Model<GameRecord>,
		@Inject(DatabaseConstants.PLAYER_PROVIDER) private readonly jugadores: Model<PlayerRecord>,
	) {}

	/**
	 * Inicia la partida de un juego: cobra las apuestas, las registra en el libro de tokens,
	 * crea el agregado con la primera ronda repartida y marca el juego como activo, todo en
	 * una sola transacción. Un segundo inicio concurrente falla sin cobrar dos veces.
	 * @param {Game} game El juego (sala) que se inicia.
	 * @param {UserId} solicitante El usuario que inicia; debe ser el anfitrión.
	 * @returns {Promise<Partida>} La partida creada.
	 * @throws {MatchCannotBeStartedException} Si el juego no está listo o ya se inició.
	 * @throws {OnlyGameHostCanStartTheMatchException} Si quien inicia no es el anfitrión.
	 * @throws {NotEnoughTokensException} Si algún jugador no tiene tokens para la apuesta.
	 */
	async iniciarPartida(game: Game, solicitante: UserId): Promise<Partida> {
		this.logger.log(`[${this.iniciarPartida.name}] INIT :: game: ${game.gameId.toString()}`);
		if (!game.status.is(GameStatusConstants.WAITING_TO_START)) throw new MatchCannotBeStartedException();
		if (game.hostId.toString() !== solicitante.toString()) throw new OnlyGameHostCanStartTheMatchException();
		const regla: ReglaJuegoPlugin = this.registroReglas.obtener(game.ruleId);
		const juego: GameRecord = game.toDTO();
		const lobby = await this.jugadores.find({ gameId: juego.gameId, isActive: true }, { userId: 1 }).lean<Array<Pick<PlayerRecord, 'userId'>>>();
		const orden = this.barajador.barajar(lobby);
		const partidaId = new Types.ObjectId();
		const resultado = await this.unidadDeTrabajo.ejecutar(async (session) => {
			const { asientos, aportes, participantes } = await this.cobrarApuestas(orden, juego, partidaId, session);
			const anfitrion = participantes.find((p) => p.jugadorId === juego.hostId) ?? participantes[0];
			const transicion = crearPartida(
				this.datosNuevaPartida(partidaId, juego, regla, anfitrion.usuarioId, participantes, aportes),
				regla.configuracionReparto(),
				this.barajador,
			);
			await this.asientos.registrar(asientos, session);
			await this.partidas.insertar(aRegistro(transicion.partida), session);
			const actualizado = await this.juegos.updateOne(
				{ gameId: juego.gameId, status: GameStatusConstants.WAITING_TO_START },
				{ $set: { status: GameStatusConstants.ACTIVE, wasInitiated: true, partidaId: partidaId.toHexString() } },
				{ session },
			);
			if (actualizado.matchedCount !== 1) throw new MatchCannotBeStartedException();
			return transicion;
		});
		this.publicar(juego.gameId, resultado);
		this.logger.log(`[${this.iniciarPartida.name}] FINISH :: partida: ${partidaId.toHexString()}`);
		return resultado.partida;
	}

	/** Comando robar (del mazo o del pozo de descarte). */
	async robar(comando: ComandoTurno, origen: OrigenRobo): Promise<ResultadoComando> {
		return this.ejecutar(comando, (partida) => robar(partida, comando.usuarioId, origen, this.barajador));
	}

	/** Comando descartar (pasa el turno; en la ronda extra, el último descarte liquida la ronda). */
	async descartar(comando: ComandoTurno, carta: number, grupos?: number[][]): Promise<ResultadoComando> {
		return this.ejecutar(comando, (partida, regla) =>
			descartar(partida, comando.usuarioId, carta, grupos, { regla, barajador: this.barajador, ahora: new Date() }),
		);
	}

	/** Comando intentar cierre de ronda (4-3-3 o tocar). */
	async intentarCierre(comando: ComandoTurno, tipo: TipoCierre, grupos: number[][], descarte: number): Promise<ResultadoComando> {
		return this.ejecutar(comando, (partida, regla) =>
			intentarCierre(partida, comando.usuarioId, { tipo, grupos, descarte }, { regla, barajador: this.barajador, ahora: new Date() }),
		);
	}

	/**
	 * Estado actual de la partida para un usuario: vista pública + su mano (RF-14).
	 * @throws {PartidaInvalidaException} Si el usuario no es jugador de la partida.
	 */
	async obtenerEstado(partidaId: string, usuarioId: string): Promise<EstadoParaUsuario> {
		const partida = await this.cargar(partidaId);
		if (!partida.jugadores.some((j) => j.jugadorId === usuarioId)) {
			throw new PartidaInvalidaException(M.JUGADOR_NO_PERTENECE_A_LA_PARTIDA);
		}
		return { publica: vistaPublica(partida), privada: vistaPrivada(partida, usuarioId) };
	}

	/**
	 * Ruta común de los comandos de turno: idempotencia, cálculo en memoria, escritura
	 * condicional y publicación después del commit.
	 */
	private async ejecutar(
		comando: ComandoTurno,
		aplicar: (partida: Partida, regla: ReglaJuegoPlugin) => ResultadoTransicion,
	): Promise<ResultadoComando> {
		const base = await this.cargar(comando.partidaId);
		if (base.comandosRecientes.includes(comando.idComando)) return { aplicado: false, partida: base };
		// Las guardas de estado y turno del dominio responden RONDA_YA_CERRADA / TURNO_NO_CORRESPONDE de inmediato.
		const resultado = aplicar(base, this.registroReglas.obtener(base.configuracion.plugin.id));
		if (base.version !== comando.version) throw new PartidaConflictException(M.VERSION_DESACTUALIZADA);
		const nueva: Partida = {
			...resultado.partida,
			version: base.version + 1,
			comandosRecientes: [...base.comandosRecientes, comando.idComando].slice(-20),
			actualizadaEn: new Date(),
		};
		try {
			await this.guardar(nueva, comando, resultado.finalizada);
		} catch (e) {
			if (e instanceof EscrituraSinCoincidencia) return this.resolverConflicto(comando, base);
			throw e;
		}
		this.publicar(comando.salaId, { ...resultado, partida: nueva });
		return { aplicado: true, partida: nueva };
	}

	/**
	 * Persiste el comando. Si la partida terminó, la escritura del agregado y el pago del
	 * pozo van en la misma transacción; si no, es una sola escritura atómica.
	 */
	private async guardar(nueva: Partida, comando: ComandoTurno, finalizada: boolean): Promise<void> {
		const condicion = { version: comando.version, jugadorId: comando.usuarioId, idComando: comando.idComando };
		if (!finalizada) {
			if (!(await this.partidas.actualizarSiCoincide(aRegistro(nueva), condicion))) throw new EscrituraSinCoincidencia();
			return;
		}
		await this.unidadDeTrabajo.ejecutar(async (session) => {
			if (!(await this.partidas.actualizarSiCoincide(aRegistro(nueva), condicion, session))) throw new EscrituraSinCoincidencia();
			await this.pagarPozo(nueva, comando.salaId, session);
		});
	}

	/**
	 * Otro comando ganó la carrera: se relee la partida para responder con un error
	 * controlado, o con éxito idempotente si el mismo `idComando` ya se aplicó.
	 */
	private async resolverConflicto(comando: ComandoTurno, base: Partida): Promise<ResultadoComando> {
		const actual = await this.cargar(comando.partidaId);
		if (actual.comandosRecientes.includes(comando.idComando)) return { aplicado: false, partida: actual };
		const ronda = actual.rondaActual;
		const rondaCambio = !ronda || ronda.numero !== base.rondaActual?.numero || !['EN_TURNOS', 'RONDA_EXTRA'].includes(ronda.estado);
		if (actual.estado !== 'EN_JUEGO' || rondaCambio) throw new PartidaConflictException(M.RONDA_YA_CERRADA);
		if (ronda.turno.jugadorId !== comando.usuarioId) throw new PartidaConflictException(M.TURNO_NO_CORRESPONDE);
		throw new PartidaConflictException(M.VERSION_DESACTUALIZADA);
	}

	/**
	 * Cobra la apuesta de cada jugador (débito condicionado a tener saldo) y prepara los
	 * asientos `APUESTA` del libro de tokens. Se ejecuta dentro de la transacción de inicio.
	 */
	private async cobrarApuestas(
		lobby: Array<Pick<PlayerRecord, 'userId'>>,
		juego: GameRecord,
		partidaId: Types.ObjectId,
		session: ClientSession,
	) {
		const asientos: AsientoTokensRecord[] = [];
		const aportes: AportePozo[] = [];
		const participantes: DatosNuevaPartida['jugadores'] = [];
		const ahora = new Date();
		for (const [indice, jugador] of lobby.entries()) {
			const usuario = await this.usuarios
				.findOneAndUpdate({ userId: jugador.userId, tokens: { $gte: juego.betByPlayer } }, { $inc: { tokens: -juego.betByPlayer } }, { session, new: true })
				.lean<UserRecord & { _id: Types.ObjectId }>();
			if (!usuario) throw new NotEnoughTokensException();
			const asientoId = new Types.ObjectId();
			asientos.push({
				_id: asientoId,
				usuarioId: usuario._id,
				tipo: 'APUESTA',
				monto: -juego.betByPlayer,
				referencia: `APUESTA:${partidaId.toHexString()}:${usuario._id.toHexString()}`,
				partidaId,
				en: ahora,
			});
			aportes.push({ usuarioId: usuario._id.toHexString(), tipo: 'APUESTA', monto: juego.betByPlayer, asientoId: asientoId.toHexString() });
			participantes.push({ jugadorId: jugador.userId, usuarioId: usuario._id.toHexString(), nombreUsuario: usuario.username, posicion: indice + 1 });
		}
		return { asientos, aportes, participantes };
	}

	/**
	 * Paga el pozo al ganador (asiento `PREMIO_POZO` con referencia única y crédito en la
	 * caché `tokens`), cierra la sala y libera a los jugadores. Va en la misma transacción
	 * que la escritura final del agregado.
	 */
	private async pagarPozo(partida: Partida, salaId: string, session: ClientSession): Promise<void> {
		const ganador = partida.jugadores.find((j) => j.jugadorId === partida.ganadorId);
		const partidaId = new Types.ObjectId(partida._id);
		await this.asientos.registrar(
			[{
				_id: new Types.ObjectId(),
				usuarioId: new Types.ObjectId(ganador.usuarioId),
				tipo: 'PREMIO_POZO',
				monto: partida.pozo.total,
				referencia: `PREMIO_POZO:${partida._id}`,
				partidaId,
				en: new Date(),
			}],
			session,
		);
		await this.usuarios.updateOne({ userId: ganador.jugadorId }, { $inc: { tokens: partida.pozo.total } }, { session });
		const ids = partida.jugadores.map((j) => j.jugadorId);
		await this.usuarios.updateMany({ userId: { $in: ids } }, { $set: { status: UserStatusConstants.ACTIVE } }, { session });
		await this.juegos.updateOne({ gameId: salaId }, { $set: { status: GameStatusConstants.FINISHED } }, { session });
		await this.jugadores.updateMany({ gameId: salaId }, { $set: { isActive: false } }, { session });
	}

	private datosNuevaPartida(
		partidaId: Types.ObjectId,
		juego: GameRecord,
		regla: ReglaJuegoPlugin,
		anfitrionId: string,
		jugadores: DatosNuevaPartida['jugadores'],
		aportes: AportePozo[],
	): DatosNuevaPartida {
		const configuracion: ConfiguracionPartida = {
			modalidad: regla.descriptor.id,
			plugin: { id: regla.descriptor.id, version: regla.descriptor.version },
			cupo: juego.requiredPlayers,
			apuestaPorJugador: juego.betByPlayer,
			visibilidad: juego.isPublic ? 'PUBLICA' : 'PRIVADA',
			tipoEscalera: 'CON_VUELTA',
			comodinesActivos: false,
			reengancheActivo: false,
			victoriaNegativaActiva: regla.descriptor.multironda,
			parametros: { ...this.parametros },
		};
		return {
			id: partidaId.toHexString(),
			codigoInvitacion: Array.from({ length: LONGITUD_CODIGO }, () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]).join(''),
			nombre: juego.name.slice(0, NOMBRE_MAXIMO).padEnd(NOMBRE_MINIMO, '_'),
			anfitrionId,
			configuracion,
			jugadores,
			aportes,
			ahora: new Date(),
		};
	}

	private async cargar(partidaId: string): Promise<Partida> {
		if (!Types.ObjectId.isValid(partidaId)) throw new PartidaNotFoundException();
		const registro = await this.partidas.buscarPorId(new Types.ObjectId(partidaId));
		if (!registro) throw new PartidaNotFoundException();
		return aDominio(registro);
	}

	/** Publica los eventos de dominio (solo después del commit). */
	private publicar(salaId: string, resultado: ResultadoTransicion): void {
		this.eventBus.publish(new PartidaActualizadaEvent(salaId, resultado.partida, resultado.eventos));
	}
}
