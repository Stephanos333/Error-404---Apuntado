import { Exception } from '../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when a user other than the creator of the game
 * tries to start the match.
 */
export class OnlyGameHostCanStartTheMatchException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.ONLY_GAME_HOST_CAN_START_THE_MATCH_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}