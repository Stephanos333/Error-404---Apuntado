import { HttpStatus } from '@nestjs/common';
import { Exception } from '../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';

/**
 * Conflicto de concurrencia sobre la partida (HTTP 409): otro comando ganó la carrera
 * (`RONDA_YA_CERRADA`, `TURNO_NO_CORRESPONDE` o `VERSION_DESACTUALIZADA`).
 * El cliente debe descartar su intención y pedir el estado actual.
 * @class
 * @extends {Exception}
 */
export class PartidaConflictException extends Exception {
	constructor(message: ExceptionMessagesConstants) {
		super(message, HttpStatus.CONFLICT);
	}
}

/**
 * Comando inválido para el estado actual de la partida (HTTP 400).
 * @class
 * @extends {Exception}
 */
export class PartidaInvalidaException extends Exception {
	constructor(message: ExceptionMessagesConstants) {
		super(message, HttpStatus.BAD_REQUEST);
	}
}

/**
 * La partida solicitada no existe (HTTP 404).
 * @class
 * @extends {Exception}
 */
export class PartidaNotFoundException extends Exception {
	constructor() {
		super(ExceptionMessagesConstants.PARTIDA_NO_ENCONTRADA, HttpStatus.NOT_FOUND);
	}
}
