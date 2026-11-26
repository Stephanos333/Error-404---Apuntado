import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when a player ID is validated
 * and does not meet the requirements of the application.
 * @class
 * @extends Exception
 */
export class InvalidPlayerIdException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.INVALID_PLAYER_ID_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}