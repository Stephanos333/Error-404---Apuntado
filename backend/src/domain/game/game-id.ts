import { IdValueObject } from '../../shared/id.value-object';
import { v4, validate } from 'uuid';
import { InvalidGameIdException } from './exceptions/invalid-game-id.exception';

/**
 * ID of a game.
 * @class
 * @extends {IdValueObject}
 */
export class GameId extends IdValueObject {

	/**
	 * Generates the game IDs.
	 * @returns {string} The generated ID.
	 * @static
	 */
	static create(): string {
		return v4();
	}

	/**
	 * Validates the characteristics of a game ID.
	 * @param {string} value The ID to validate.
	 * @throws {InvalidUserIdException} When the ID is not valid.
	 * @protected
	 */
	protected validate(value: string): void {
		if (!validate(value)) throw new InvalidGameIdException();
	}
}