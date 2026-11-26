import { IdValueObject } from '../../shared/id.value-object';
import { v4, validate } from 'uuid';
import { InvalidPlayerIdException } from './exceptions/invalid-player-id.exception';

/**
 * ID of a player.
 * @class
 * @extends {IdValueObject}
 */
export class PlayerId extends IdValueObject {

	/**
	 * Generates the player IDs.
	 * @returns {string} The generated ID.
	 * @static
	 */
	static create(): string {
		return v4();
	}

	/**
	 * Validates the characteristics of a player
	 * ID.
	 * @param {string} value The ID to validate.
	 * @protected
	 * @throws {InvalidPlayerIdException} When the ID is not valid.
	 */
	protected validate(value: string): void {
		if (!validate(value)) throw new InvalidPlayerIdException();
	}
}