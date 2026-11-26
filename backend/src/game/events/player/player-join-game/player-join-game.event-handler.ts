import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerJoinGameEvent } from '../../../../domain/events/player/player-join-game/player-join-game.event';
import { GameSocket } from '../../../socket/game.socket';
import { Logger } from '@nestjs/common';

/**
 * Handler that captures the event of having joined a game.
 */
@EventsHandler(PlayerJoinGameEvent)
export class PlayerJoinGameEventHandler implements IEventHandler<PlayerJoinGameEvent> {

	private readonly logger: Logger = new Logger(PlayerJoinGameEventHandler.name);

	/**
	 * @param socket The socket of the game events.
	 */
	constructor(private readonly socket: GameSocket) {
	}

	/**
	 * Runs the event.
	 * @param event The event being run.
	 */
	async handle(event: PlayerJoinGameEvent): Promise<void> {
		try {
			await this.socket.joinPlayer(event.user, event.player, event.game);
		} catch (e) {
			this.logger.error(`${this.handle.name} Something went wrong : ${e.message}`);
		}
	}
}