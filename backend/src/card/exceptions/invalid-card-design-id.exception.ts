import { DomainException } from '../../shared/exceptions/domain.exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';
/**
 * Excepción que se lanza cuando se valida el ID de un diseño de carta
 * y no cumple con las características requeridas por la aplicación.
 * Es una excepción de dominio pura: el filtro global la traduce a HTTP 400.
 * @class
 * @extends {DomainException}
 */
export class InvalidCardDesignIdException extends DomainException {
	constructor() {
		super(ExceptionMessagesConstants.INVALID_CARD_DESIGN_ID_ERROR);
	}
}
