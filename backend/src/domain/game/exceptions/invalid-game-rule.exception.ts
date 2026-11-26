import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when trying to create a game with a rule
 * (plug-in) that is not registered.
 * @class
 * @extends {Exception}
 */
export class InvalidGameRuleException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.INVALID_GAME_RULE_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}
