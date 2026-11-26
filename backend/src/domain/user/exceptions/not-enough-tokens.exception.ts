import {HttpStatus} from '@nestjs/common';
import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Thrown when a user tries to perform a token operation
 * and does not have enough.
 * @class
 * @extends {Exception}
 */
export class NotEnoughTokensException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.NOT_ENOUGH_TOKENS_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}