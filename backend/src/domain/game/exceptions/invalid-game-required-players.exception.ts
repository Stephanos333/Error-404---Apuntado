import { Exception } from '../../../shared/exceptions/exception';
import { HttpStatus } from '@nestjs/common';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Thrown when the number of players required
 * for a game is not valid
 * @class
 * @extends {Exception}
 */
export class InvalidGameRequiredPlayersException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.INVALID_GAME_REQUIRED_PLAYERS_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}