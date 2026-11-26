import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when trying to add a player to a game that is already full.
 * @class
 * @extends Exception
 */
export class GameExceedsItsPlayerCountException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.GAME_EXCEEDS_ITS_PLAYER_COUNT_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}