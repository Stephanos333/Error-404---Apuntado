import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameReadyToStartEvent } from '../../../domain/events/game-ready-to-start/game-ready-to-start.event';
import { GameSocket } from '../../socket/game.socket';
import { Logger } from '@nestjs/common';

/**
 * Event handler that signals that a game is ready to be started.
 */
@EventsHandler(GameReadyToStartEvent)
export class GameReadyToStartEventHandler implements IEventHandler<GameReadyToStartEvent> {

	private readonly logger: Logger = new Logger(GameReadyToStartEventHandler.name);

	/**
	 * @param socket The websocket of the game events.
	 */
	constructor(private readonly socket: GameSocket) {
	}

	/**
	 * Runs the event.
	 * @param event The event being run.
	 */
	handle(event: GameReadyToStartEvent) {
		try {
			this.socket.gameReadyToStart(event.game);
		} catch (e) {
			this.logger.error(`[${this.handle.name}] ERROR :: ${e.message}`);
		}
	}
}