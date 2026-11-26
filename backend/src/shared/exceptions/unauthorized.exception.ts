import { Exception } from './exception';
import { ExceptionMessagesConstants } from './exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when a user has no access
 * to a resource.
 * @class
 * @extends {Exception}
 */
export class UnauthorizedException extends Exception {

	/**
	 * @param {ExceptionMessagesConstants} [message=ExceptionMessagesConstants.UNAUTHORIZED]
	 * Error message of the exception.
	 */
	constructor(message: ExceptionMessagesConstants = ExceptionMessagesConstants.UNAUTHORIZED) {
		super(message, HttpStatus.UNAUTHORIZED);
	}
}