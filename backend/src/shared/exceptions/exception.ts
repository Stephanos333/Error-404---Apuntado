import { HttpException, HttpStatus } from '@nestjs/common';
import { ExceptionMessagesConstants } from './exception-messages.constants';

/**
 * Errors of the application.
 * @class
 * @extends HttpException
 */
export class Exception extends HttpException {
	/**
	 * @constructor
	 * @param {ExceptionMessagesConstants} customMessage The error message.
	 * @param {HttpStatus} status The error code.
	 */
	constructor(
		public readonly customMessage: ExceptionMessagesConstants,
		status: HttpStatus,
	) {
		super({ message: customMessage }, status);
	}
}
