import { HttpStatus } from '@nestjs/common';
import { Exception } from '../../shared/exceptions/exception';
import { ExceptionMessagesConstants } from '../../shared/exceptions/exception-messages.constants';

/**
 * Concurrency conflict on the match (HTTP 409): another command won the race
 * (`ROUND_ALREADY_CLOSED`, `NOT_YOUR_TURN` or `STALE_VERSION`).
 * The client must drop its intent and request the current state.
 * @class
 * @extends {Exception}
 */
export class MatchConflictException extends Exception {
	constructor(message: ExceptionMessagesConstants) {
		super(message, HttpStatus.CONFLICT);
	}
}

/**
 * Invalid command for the current state of the match (HTTP 400).
 * @class
 * @extends {Exception}
 */
export class InvalidMatchException extends Exception {
	constructor(message: ExceptionMessagesConstants) {
		super(message, HttpStatus.BAD_REQUEST);
	}
}

/**
 * The requested match does not exist (HTTP 404).
 * @class
 * @extends {Exception}
 */
export class MatchNotFoundException extends Exception {
	constructor() {
		super(ExceptionMessagesConstants.MATCH_NOT_FOUND, HttpStatus.NOT_FOUND);
	}
}
