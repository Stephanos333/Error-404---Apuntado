import { Game } from '../../game/game';

/**
 * Event that signals that a game is ready to be started.
 */
export class GameReadyToStartEvent {

	/**
	 * @param game The game that is ready to start.
	 */
	constructor(public readonly game: Game) {
	}
}