import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when the status of a game is validated
 * against the constants file.
 * @class
 * @extends {Exception}
 */
export class InvalidGameStatusException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.INVALID_GAME_STATUS_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}