import { DomainException } from '../../shared/exceptions/domain.exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';
/**
 * Thrown when the ID of a card design is validated
 * and does not meet the requirements of the application.
 * It is a pure domain exception: the global filter translates it into HTTP 400.
 * @class
 * @extends {DomainException}
 */
export class InvalidCardDesignIdException extends DomainException {
	constructor() {
		super(ExceptionMessagesConstants.INVALID_CARD_DESIGN_ID_ERROR);
	}
}
