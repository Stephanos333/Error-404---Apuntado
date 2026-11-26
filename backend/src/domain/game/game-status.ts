import { StatusValueObject } from '../../shared/status.value-object';
import { GameStatusConstants } from './game-status.constants';
import { InvalidGameStatusException } from './exceptions/invalid-game-status.exception';

/**
 * Status of a game.
 * @class
 * @extends {StatusValueObject<GameStatusConstants>}
 */
export class GameStatus extends StatusValueObject<GameStatusConstants> {

	/**
	 * Determines whether the status of a game is not valid.
	 * @param {string} value The status of the game.
	 * @throws {InvalidGameStatusException} When the status of the game is not valid.
	 * @protected
	 */
	protected validate(value: string) {
		if (!(value in GameStatusConstants)) throw new InvalidGameStatusException();
	}
}