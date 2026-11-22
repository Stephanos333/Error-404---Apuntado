/**
 * Plan de notificaciones en tiempo real de la partida (ADR-05, R04 anti-trampas).
 *
 * Función pura: a partir del estado confirmado y de los eventos del comando decide qué
 * mensaje va a qué sala. A la sala pública `partida:{id}` solo llega la vista pública
 * (tamaño de cada mano, tope del pozo, turno, quién cerró). A cada sala privada
 * `usuario:{id}` llega únicamente la mano de ese usuario.
 */
import { Partida } from '../../dominio/partida/partida';
import { EventoPartida, TipoEventoPartida } from '../../dominio/partida/comandos-partida';
import { VistaPrivadaPartida, VistaPublicaPartida, vistaPrivada, vistaPublica } from '../../dominio/partida/vistas-partida';
import { GameSocketConstants } from './game.socket.constants';
import { salaPrivada, salaPublica } from './salas';

/** Mensaje público de un evento de la partida. */
export interface MensajePublicoPartida {
	evento: TipoEventoPartida;
	salaId: string;
	jugadorId: string | null;
	detalle: Readonly<Record<string, unknown>>;
	partida: VistaPublicaPartida;
}

/** Mensaje privado con la mano de un jugador. */
export interface MensajePrivadoPartida {
	salaId: string;
	mano: VistaPrivadaPartida;
}

/** Un envío planificado: sala, nombre del mensaje y contenido. */
export interface Envio {
	sala: string;
	mensaje: GameSocketConstants;
	contenido: MensajePublicoPartida | MensajePrivadoPartida;
}

/** Mensaje público que corresponde a cada evento de dominio. */
function mensajePublico(evento: EventoPartida): GameSocketConstants {
	const porTipo: Record<TipoEventoPartida, GameSocketConstants> = {
		PARTIDA_INICIADA: GameSocketConstants.MATCH_STARTED_LISTENER,
		CARTA_ROBADA: GameSocketConstants.CARD_PULLED_FROM_DECK_LISTENER,
		TURNO_CAMBIADO: GameSocketConstants.SHIFT_CHANGED_LISTENER,
		CIERRE_FALLIDO: GameSocketConstants.PLAYER_CANT_WIN_LISTENER,
		JUGADOR_TOCO: GameSocketConstants.PLAYER_KNOCKED_LISTENER,
		RONDA_CERRADA: GameSocketConstants.MATCH_WON_LISTENER,
		RONDA_INICIADA: GameSocketConstants.ROUND_STARTED_LISTENER,
		PARTIDA_FINALIZADA: GameSocketConstants.GAME_FINISHED_LISTENER,
	};
	if (evento.tipo !== 'CARTA_ROBADA') return porTipo[evento.tipo];
	if (evento.detalle.origen === 'DESCARTE') return GameSocketConstants.CARD_PULLED_FROM_DISCARDED_LISTENER;
	return evento.detalle.mazoRellenado ? GameSocketConstants.CARD_DECK_FILLED_LISTENER : porTipo.CARTA_ROBADA;
}

/** Jugadores cuya mano cambió con el evento y deben recibirla por su sala privada. */
function manosAfectadas(evento: EventoPartida, partida: Partida): string[] {
	const todos = partida.rondaActual?.manos.map((m) => m.jugadorId) ?? [];
	if (evento.tipo === 'PARTIDA_INICIADA' || evento.tipo === 'RONDA_INICIADA') return todos;
	const cambiaSuMano: ReadonlyArray<TipoEventoPartida> = ['CARTA_ROBADA', 'TURNO_CAMBIADO', 'JUGADOR_TOCO'];
	return evento.jugadorId && cambiaSuMano.includes(evento.tipo) ? [evento.jugadorId] : [];
}

/**
 * Planifica los envíos de un comando confirmado.
 * @param {string} salaId El id del juego (sala).
 * @param {Partida} partida El estado confirmado.
 * @param {ReadonlyArray<EventoPartida>} eventos Los eventos del comando, en orden.
 * @returns {Envio[]} Los envíos: primero los públicos, luego las manos privadas.
 */
export function planificarNotificaciones(salaId: string, partida: Partida, eventos: ReadonlyArray<EventoPartida>): Envio[] {
	const publica = vistaPublica(partida);
	const publicos: Envio[] = eventos.map((evento) => ({
		sala: salaPublica(salaId),
		mensaje: mensajePublico(evento),
		contenido: { evento: evento.tipo, salaId, jugadorId: evento.jugadorId ?? null, detalle: evento.detalle, partida: publica },
	}));
	const destinatarios = [...new Set(eventos.flatMap((e) => manosAfectadas(e, partida)))];
	const privados: Envio[] = destinatarios
		.map((jugadorId) => ({ jugadorId, mano: vistaPrivada(partida, jugadorId) }))
		.filter((p) => p.mano !== null)
		.map((p) => ({ sala: salaPrivada(p.jugadorId), mensaje: GameSocketConstants.PRIVATE_HAND_LISTENER, contenido: { salaId, mano: p.mano } }));
	return [...publicos, ...privados];
}
