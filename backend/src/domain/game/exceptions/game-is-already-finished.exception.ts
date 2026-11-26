import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when trying to access the
 * resources of a game that has already finished.
 * @class
 * @extends Exception
 */
export class GameIsAlreadyFinishedException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.GAME_IS_ALREADY_FINISHED_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}