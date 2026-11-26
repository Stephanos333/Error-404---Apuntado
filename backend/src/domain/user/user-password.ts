import { StringValueObject } from '../../shared/string.value-object';
import { InvalidPasswordError } from './exceptions/invalid-password.error';
import { SHA256 } from 'crypto-js';

/**
 * Password of a user.
 * @class
 * @extends {StringValueObject}
 */
export class UserPassword extends StringValueObject {

	/**
	 * The structure a password must follow.
	 * @type {RegExp}
	 * @static
	 * @private
	 */
	private static regexp: RegExp = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*[!#$%&()*,\-.:;<>?^_{|}~¡¿])\S{8,}$/;

	/**
	 * Builds the password of a user.
	 * @param {string} value The plain value of the password.
	 * @returns {string} The generated value.
	 */
	static hash(value: string): string {
		return SHA256(value).toString();
	}

	/**
	 * Validates the structure of a user password.
	 * @param {string} value The value to validate.
	 * @throws {InvalidPasswordError} When the password does not meet the
	 * requirements of the system.
	 */
	static validate(value: string): void {
		if (!value.match(this.regexp)) throw new InvalidPasswordError();
	}

	/**
	 * Compares the password with any value.
	 * @param {string} value The value to compare
	 * @returns {boolean} Whether the values are equal.
	 */
	compare(value: string): boolean {
		return UserPassword.hash(value) === this.value;
	}
}