import { User } from '../../../user/user';
import { Player } from '../../../player/player';
import { Game } from '../../../game/game';

/**
 * Event that signals that a user joined a game.
 */
export class PlayerJoinGameEvent {

	/**
	 * @param {User} user The user who joined the game.
	 * @param {Player} player The created player.
	 * @param {Game} game The joined game.
	 */
	constructor(
		public readonly user: User,
		public readonly player: Player,
		public readonly game: Game,
	) {
	}
}