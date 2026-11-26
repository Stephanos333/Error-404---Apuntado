/**
 * @enum {string} Configuration constants of the match controller (`matches` aggregate).
 * @readonly
 */
export enum MatchPlayControllerConstants {
	/**
	 * Prefix of the match routes.
	 */
	CONTROLLER_PREFIX = 'matches',
	/**
	 * Tag that groups the match routes in Swagger.
	 */
	CONTROLLER_TAG = 'Matches',
	/**
	 * State of the user's current match (public view + their hand). RF-14, reconnection.
	 */
	STATE_URL = 'current',
	/**
	 * Comando robar.
	 */
	DRAW_URL = 'current/commands/draw',
	/**
	 * Discard command (passes the turn).
	 */
	DISCARD_URL = 'current/commands/discard',
	/**
	 * Attempt-to-close-the-round command.
	 */
	CLOSE_URL = 'current/commands/close',
}
