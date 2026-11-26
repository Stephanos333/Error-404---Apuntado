import { HttpStatus } from '@nestjs/common';
import { ExceptionMessagesConstants } from './exception-messages.constants';
import { Exception } from './exception';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Error response of the application.
 * @class
 */
export class ExceptionResponse {
	public readonly message: string;
	public readonly code: number;
	private readonly success: boolean;

	/**
	 * @param {string} [message=ExceptionMessagesConstants.INTERNAL_SERVER_ERROR] The error message.
	 * @param {number} [code=HttpStatus.INTERNAL_SERVER_ERROR] The error code.
	 */
	constructor(
		message: string = ExceptionMessagesConstants.INTERNAL_SERVER_ERROR,
		code: number = HttpStatus.INTERNAL_SERVER_ERROR,
	) {
		this.message = message;
		this.code = code;
		this.success = false;
	}

	/**
	 * Converts a basic exception into the response model.
	 * @static
	 * @param {Exception} exception The exception to convert.
	 * @returns {ExceptionResponse}
	 */
	public static fromExceptionBase(exception: Exception): ExceptionResponse {
		return new ExceptionResponse(exception.message, exception.getStatus());
	}

	/**
	 * Converts the error response into its transfer object.
	 * @public
	 * @returns {ExceptionResponseDTO}
	 */
	public toDTO(): ExceptionResponseDTO {
		return {
			code: this.code,
			message: this.message,
			success: this.success,
		};
	}
}

/**
 * Transfer object of an error response
 * of the application.
 * @class
 */
export class ExceptionResponseDTO {
	@ApiProperty() message: string;
	@ApiProperty() code: number;
	@ApiProperty() success: boolean;
}
