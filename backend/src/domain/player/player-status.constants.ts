export enum PlayerStatusConstants {
	/**
	 * The player is in their turn.
	 */
	IN_TURN = 'IN_TURN',
	/**
	 * The player has lost the game.
	 */
	LOSER = 'LOSER',
	/**
	 * The player is knocking in a match.
	 */
	TOUCHING = 'TOUCHING',
	/**
	 * The player is waiting for the game
	 * to start.
	 */
	WAITING_GAME = 'WAITING_GAME',
	/**
	 * The player is waiting for their next
	 * turn.
	 */
	WAITING_TURN = 'WAITING_TURN',
	/**
	 * The player has won a game.
	 */
	WINNER = 'WINNER',
}