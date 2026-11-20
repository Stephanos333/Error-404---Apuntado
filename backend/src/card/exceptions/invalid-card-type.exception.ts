import { DomainException } from '../../shared/exceptions/domain.exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';
/**
 * Se lanza cuando el tipo de una carta no se encuentra en
 * el archivo de constantes.
 * Es una excepción de dominio pura: el filtro global la traduce a HTTP 400.
 * @class
 * @extends DomainException
 */
export class InvalidCardTypeException extends DomainException {
	constructor() {
		super(ExceptionMessagesConstants.INVALID_CARD_TYPE_ERROR);
	}
}
