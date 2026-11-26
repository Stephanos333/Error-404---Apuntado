import { Response } from 'express';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpArgumentsHost, RpcArgumentsHost, WsArgumentsHost } from '@nestjs/common/interfaces';
import { Exception } from './exception';
import { DomainException } from './domain.exception';
import { ExceptionResponse, ExceptionResponseDTO } from './exception.response';
import { Socket } from 'socket.io';
import { SocketSharedConstants } from '../socket/socket-shared.constants';

/**
 * Handles the errors of the application.
 * @class
 * @implements {ExceptionFilter}
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
	/**
	 * Resolves the error message of an unknown exception.
	 *
	 * @static
	 * @param exception The unknown exception.
	 * @returns {string | undefined} The resolved error message; undefined when it
	 * cannot be resolved.
	 */
	public static resolveMessage(exception): string | undefined {
		if (typeof exception === 'object') {
			if (exception.response?.message) {
				if (Array.isArray(exception.response.message)) {
					return exception.response.message.join(', ');
				} else if (typeof exception.response.message === 'string') {
					return exception.response.message;
				}
			} else if (exception.message && typeof exception.message == 'string') {
				return exception.message;
			}
		}
		if (typeof exception === 'string') {
			return exception;
		}
		return undefined;
	}

	/**
	 * Resolves the error code of an unknown exception.
	 * @param {Error} exception The unknown exception.
	 * @returns {number | undefined} The resolved error code; undefined when it
	 * cannot be resolved.
	 */
	public static resolveStatus(exception: Error): number | undefined {
		return exception instanceof HttpException ? exception.getStatus() : undefined;
	}

	/**
	 * Sends the error response to the end user depending on the execution context.
	 * @param {ArgumentsHost} host The execution context.
	 * @param {ExceptionResponseDTO} responseDto The response to send.
	 * @private
	 * @static
	 */
	private static setExceptionResponse(host: ArgumentsHost, responseDto: ExceptionResponseDTO): void {
		let context: RpcArgumentsHost | HttpArgumentsHost | WsArgumentsHost;
		let response: Response;
		switch (host.getType()) {
		case 'http':
			context = host.switchToHttp();
			response = context.getResponse<Response>();
			response.status(responseDto.code).json(responseDto);
			break;
		case 'ws': {
			context = host.switchToWs();
			const client = context.getClient<Socket>();
			client.emit(SocketSharedConstants.LISTENER_ERROR_MESSAGES, responseDto);
			break;
		}
		default:
			throw responseDto;
		}
	}

	/**
	 * Receives the exceptions of the system and maps them to be sent to the end user.
	 * @param {Error} exception The exception to map
	 * @param {ArgumentsHost} host The execution context.
	 */
	catch(exception: Error, host: ArgumentsHost): void {
		let response: ExceptionResponse;
		if (exception instanceof Exception) {
			response = ExceptionResponse.fromExceptionBase(exception);
		} else if (exception instanceof DomainException) {
			response = new ExceptionResponse(exception.customMessage, HttpStatus.BAD_REQUEST);
		} else {
			response = new ExceptionResponse(
				AppExceptionFilter.resolveMessage(exception),
				AppExceptionFilter.resolveStatus(exception),
			);
		}
		const responseDto: ExceptionResponseDTO = response.toDTO();
		new Logger().error(`[${AppExceptionFilter.name}] ERROR :: ${JSON.stringify(responseDto)}`);
		AppExceptionFilter.setExceptionResponse(host, responseDto);
	}
}
