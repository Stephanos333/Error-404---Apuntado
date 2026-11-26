import { DomainException } from '../../shared/exceptions/domain.exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';
/**
 * Thrown when the suit of a card is not valid.
 * It is a pure domain exception: the global filter translates it into HTTP 400.
 * @class
 * @extends DomainException
 */
export class InvalidCardSuitException extends DomainException {
	constructor() {
		super(ExceptionMessagesConstants.INVALID_CARD_SUIT_ERROR);
	}
}
