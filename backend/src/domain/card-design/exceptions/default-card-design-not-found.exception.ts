import { Exception } from '../../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when the default card design is requested
 * and does not exist.
 * @class
 * @extends {Exception}
 */
export class DefaultCardDesignNotFoundException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.DEFAULT_CARD_DESIGN_NOT_FOUND_ERROR,
			HttpStatus.INTERNAL_SERVER_ERROR,
		);
	}
}