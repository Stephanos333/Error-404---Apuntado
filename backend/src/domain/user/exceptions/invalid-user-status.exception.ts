import { Exception } from '../../../shared/exceptions/exception';
import { HttpStatus } from '@nestjs/common';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Thrown when the status of a user is validated
 * against the constants file.
 * @class
 * @extends {Exception}
 */
export class InvalidUserStatusException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.INVALID_USER_STATUS_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}