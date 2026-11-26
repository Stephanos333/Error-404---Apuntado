import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when a game that does not exist is requested.
 * @class
 * @extends Exception
 */
export class GameNotFoundException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.GAME_NOT_FOUND_ERROR,
			HttpStatus.NOT_FOUND,
		);
	}
}