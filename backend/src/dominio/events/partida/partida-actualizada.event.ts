import { Partida } from '../../partida/partida';
import { EventoPartida } from '../../partida/comandos-partida';

/**
 * Evento de dominio local (ADR-05) que el orquestador publica SOLO después del commit.
 * Lleva el estado confirmado; los suscriptores (notificación en tiempo real) construyen
 * las vistas filtradas y no pueden alterar el resultado del comando.
 */
export class PartidaActualizadaEvent {
	/**
	 * @param {string} salaId El id del juego (sala) al que pertenece la partida.
	 * @param {Partida} partida El estado confirmado de la partida.
	 * @param {EventoPartida[]} eventos Los eventos de dominio del comando, en orden.
	 */
	constructor(
		public readonly salaId: string,
		public readonly partida: Partida,
		public readonly eventos: ReadonlyArray<EventoPartida>,
	) {}
}
