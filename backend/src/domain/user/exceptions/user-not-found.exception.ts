import { HttpStatus } from '@nestjs/common';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { Exception } from '../../../shared/exceptions/exception';

/**
 * Thrown when a user that does not exist is requested.
 * @class
 * @extends {Exception}
 */
export class UserNotFoundException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.USER_NOT_FOUND_ERROR,
			HttpStatus.NOT_FOUND,
		);
	}
}