/**
 * @enum {string} Constants for the statuses of a game.
 * @readonly
 */
export enum GameStatusConstants {
	/**
	 * The game is active.
	 */
	ACTIVE = 'ACTIVE',
	/**
	 * The game is finished.
	 */
	FINISHED = 'FINISHED',
	/**
	 * The results of a match
	 * are being shown.
	 */
	SHOWING_MATCH_RESULTS = 'SHOWING_MATCH_RESULTS',
	/**
	 * The game is waiting for
	 * players.
	 */
	WAITING_PLAYERS = 'WAITING_PLAYERS',
	/**
	 * The game is already full but
	 * has not started.
	 */
	WAITING_TO_START = 'WAITING_TO_START',
}