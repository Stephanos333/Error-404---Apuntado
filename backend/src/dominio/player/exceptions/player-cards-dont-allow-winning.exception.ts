import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Excepción que permite indicar que las cartas de un jugador no le permiten ganar.
 * @extends {Exception}
 */
export class PlayerCardsDontAllowWinningException extends Exception {
	constructor() {
		super(ExceptionMessagesConstants.PLAYER_CARDS_DONT_ALLOW_WINNING_ERROR, HttpStatus.BAD_REQUEST);
	}
}
