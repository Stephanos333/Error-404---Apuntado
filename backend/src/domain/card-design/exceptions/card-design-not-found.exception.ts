import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when the requested card design does not exist.
 * @class
 * @extends {Exception}
 */
export class CardDesignNotFoundException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.CARD_DESIGN_NOT_FOUND_ERROR,
			HttpStatus.NOT_FOUND,
		);
	}
}