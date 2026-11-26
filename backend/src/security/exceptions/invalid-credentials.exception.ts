import { Exception } from '../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when the login credentials of a user are not
 * valid.
 * @class
 * @extends {Exception}
 */
export class InvalidCredentialsException extends Exception {

	/**
	 * @param {ExceptionMessagesConstants} [message=ExceptionMessagesConstants.INVALID_CREDENTIALS_ERROR]
	 * Error message of the exception.
	 */
	constructor(message: ExceptionMessagesConstants = ExceptionMessagesConstants.INVALID_CREDENTIALS_ERROR) {
		super(message, HttpStatus.UNAUTHORIZED);
	}
}