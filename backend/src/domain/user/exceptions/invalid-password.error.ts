import { HttpStatus } from '@nestjs/common';
import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Thrown when the password of a user is validated
 * and does not meet the requirements of the system.
 * @class
 * @extends {Exception}
 */
export class InvalidPasswordError extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.INVALID_PASSWORD_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}