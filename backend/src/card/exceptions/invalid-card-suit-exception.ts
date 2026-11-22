import { DomainException } from '../../shared/exceptions/domain.exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';
/**
 * Se lanza cuando la pinta de una carta no es válida.
 * Es una excepción de dominio pura: el filtro global la traduce a HTTP 400.
 * @class
 * @extends DomainException
 */
export class InvalidCardSuitException extends DomainException {
	constructor() {
		super(ExceptionMessagesConstants.INVALID_CARD_SUIT_ERROR);
	}
}
