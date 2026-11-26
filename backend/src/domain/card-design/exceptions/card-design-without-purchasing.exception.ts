import { Exception } from '../../../shared/exceptions/exception';
import { HttpStatus } from '@nestjs/common';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Thrown when trying to select a card design
 * that has not been bought.
 * @class
 * @extends {Exception}
 */
export class CardDesignWithoutPurchasingException extends Exception {
	constructor() {
		super(
			ExceptionMessagesConstants.CARD_DESIGN_WITHOUT_PURCHASING_ERROR,
			HttpStatus.BAD_REQUEST,
		);
	}
}