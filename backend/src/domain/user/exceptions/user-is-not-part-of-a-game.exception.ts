import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when a user tries to access the resources of a game
 * they are not playing.
 * @class
 * @extends
 */
export class UserIsNotPartOfAGameException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.USER_IS_NOT_PART_OF_A_GAME_ERROR,
			HttpStatus.FORBIDDEN,
		);
	}
}