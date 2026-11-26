import { IdValueObject } from '../../shared/id.value-object';
import { InvalidUserIdException } from './exceptions/invalid-user-id.exception';
import { v4, validate } from 'uuid';

/**
 * ID of a user.
 * @class
 * @extends {IdValueObject}
 */
export class UserId extends IdValueObject {

	/**
	 * Generates the user IDs.
	 * @returns {string} The generated ID.
	 * @static
	 */
	static create(): string {
		return v4();
	}

	/**
	 * Validates the characteristics of a user ID.
	 * @param {string} value The ID to validate.
	 * @protected
	 * @throws {InvalidUserIdException} When the ID is not valid.
	 */
	protected validate(value: string): void {
		if (!validate(value)) throw new InvalidUserIdException();
	}
}