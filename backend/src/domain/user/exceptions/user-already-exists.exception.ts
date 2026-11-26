import { HttpStatus } from '@nestjs/common';
import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Thrown when trying to create a user that already exists.
 * @class
 * @extends {Exception}
 */
export class UserAlreadyExistsException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.USER_ALREADY_EXISTS_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}