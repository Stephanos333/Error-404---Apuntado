import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { MatchUpdatedEvent } from '../../../domain/events/match/match-updated.event';
import { GameSocket } from '../../socket/game.socket';

/**
 * `RealtimeNotification` subscriber (ADR-05): receives the already confirmed state and
 * notifies it through WebSocket with filtered views. An error here does not affect the command.
 */
@EventsHandler(MatchUpdatedEvent)
export class MatchUpdatedEventHandler implements IEventHandler<MatchUpdatedEvent> {
	private readonly logger: Logger = new Logger(MatchUpdatedEventHandler.name);

	/**
	 * @param {GameSocket} socket The websocket of the game events.
	 */
	constructor(private readonly socket: GameSocket) {}

	/**
	 * Runs the event.
	 * @param {MatchUpdatedEvent} event The event being run.
	 */
	handle(event: MatchUpdatedEvent): void {
		try {
			this.socket.notifyMatch(event.roomId, event.match, event.events);
		} catch (e) {
			this.logger.error(`[${this.handle.name}] ERROR :: ${e.message}`);
		}
	}
}
