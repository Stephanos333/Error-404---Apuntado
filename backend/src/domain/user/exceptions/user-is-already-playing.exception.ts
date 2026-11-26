import { HttpStatus } from '@nestjs/common';
import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Thrown when trying to change the status of a user to playing
 * while they are already playing.
 * @class
 * @extends {Exception}
 */
export class UserIsAlreadyPlayingException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.USER_IS_ALREADY_PLAYING_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}