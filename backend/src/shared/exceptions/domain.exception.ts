import { ExceptionMessagesConstants } from './exception-messages.constants';

/**
 * Domain exception without framework dependencies.
 *
 * Used by the modules that must be plain TypeScript code (for example `card/`, FF-05).
 * It represents an input that breaks a domain rule; the global `AppExceptionFilter`
 * translates it into an HTTP 400 response or a socket error message.
 * @class
 * @extends Error
 */
export class DomainException extends Error {
	/**
	 * @param {ExceptionMessagesConstants} customMessage The error message.
	 */
	constructor(public readonly customMessage: ExceptionMessagesConstants) {
		super(customMessage);
		this.name = new.target.name;
	}
}
