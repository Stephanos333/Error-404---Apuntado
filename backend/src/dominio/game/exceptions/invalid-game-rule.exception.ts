import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Excepción lanzada cuando se intenta crear un juego con una regla
 * (plug-in) que no está registrada.
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
