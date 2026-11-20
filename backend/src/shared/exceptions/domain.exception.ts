import { ExceptionMessagesConstants } from './exception-messages.constants';

/**
 * Excepción de dominio sin dependencias de framework.
 *
 * La usan los módulos que deben ser código TypeScript puro (por ejemplo `card/`, FF-05).
 * Representa un dato de entrada que viola una regla del dominio; el filtro global
 * `AppExceptionFilter` la traduce a una respuesta HTTP 400 o a un mensaje de error del socket.
 * @class
 * @extends Error
 */
export class DomainException extends Error {
	/**
	 * @param {ExceptionMessagesConstants} customMessage El mensaje de error.
	 */
	constructor(public readonly customMessage: ExceptionMessagesConstants) {
		super(customMessage);
		this.name = new.target.name;
	}
}
