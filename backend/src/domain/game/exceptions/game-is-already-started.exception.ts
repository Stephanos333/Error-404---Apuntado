import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when trying to join a game that
 * has already started.
 * @class
 * @extends Exception
 */
export class GameIsAlreadyStartedException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.GAME_IS_ALREADY_STARTED,
			HttpStatus.BAD_REQUEST,
		);
	}
}