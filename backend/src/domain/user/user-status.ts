import { UserStatusConstants } from './user-status.constants';
import { StatusValueObject } from '../../shared/status.value-object';
import { InvalidUserStatusException } from './exceptions/invalid-user-status.exception';

/**
 * Status of a user.
 * @class
 * @extends {StatusValueObject<UserStatusConstants>}
 */
export class UserStatus extends StatusValueObject<UserStatusConstants> {

	/**
	 * Determines whether the status of a user is not valid.
	 * @param {string} value The status of the user.
	 * @protected
	 * @throws {InvalidUserStatusException} When the status of a user is not valid.
	 */
	protected validate(value: string): void {
		if (!(value in UserStatusConstants)) throw new InvalidUserStatusException();
	}
}