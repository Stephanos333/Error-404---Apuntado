import { DomainException } from '../../shared/exceptions/domain.exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';
/**
 * Thrown when the type of a card is not in
 * the constants file.
 * It is a pure domain exception: the global filter translates it into HTTP 400.
 * @class
 * @extends DomainException
 */
export class InvalidCardTypeException extends DomainException {
	constructor() {
		super(ExceptionMessagesConstants.INVALID_CARD_TYPE_ERROR);
	}
}
