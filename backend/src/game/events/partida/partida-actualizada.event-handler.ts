import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PartidaActualizadaEvent } from '../../../dominio/events/partida/partida-actualizada.event';
import { GameSocket } from '../../socket/game.socket';

/**
 * Suscriptor `RealtimeNotification` (ADR-05): recibe el estado ya confirmado y lo
 * notifica por WebSocket con vistas filtradas. Un error aquí no afecta al comando.
 */
@EventsHandler(PartidaActualizadaEvent)
export class PartidaActualizadaEventHandler implements IEventHandler<PartidaActualizadaEvent> {
	private readonly logger: Logger = new Logger(PartidaActualizadaEventHandler.name);

	/**
	 * @param {GameSocket} socket El websocket de eventos de los juegos.
	 */
	constructor(private readonly socket: GameSocket) {}

	/**
	 * Ejecuta el evento.
	 * @param {PartidaActualizadaEvent} event El evento en ejecución.
	 */
	handle(event: PartidaActualizadaEvent): void {
		try {
			this.socket.notificarPartida(event.salaId, event.partida, event.eventos);
		} catch (e) {
			this.logger.error(`[${this.handle.name}] ERROR :: ${e.message}`);
		}
	}
}
