import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when the icon of a user is validated
 * and does not meet the requirements of the system.
 * @class
 * @extends {Exception}
 */
export class InvalidUserIconException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.INVALID_USER_ICON_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}