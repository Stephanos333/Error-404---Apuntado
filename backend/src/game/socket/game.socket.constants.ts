/**
 * Constants with the socket-related configuration.
 */
export enum GameSocketConstants {
	/**
	 * The namespace of the games socket.
	 */
	GAME_SOCKET_NAMESPACE = 'game',
	/**
	 * The message that validates the connection of a user.
	 */
	GAME_CONNECTION_EVENT = 'GAME_CONNECTION_EVENT',
	/**
	 * The message that signals that a user joined a game.
	 */
	JOIN_PLAYER_LISTENER = 'JOIN_PLAYER_LISTENER',
	/**
	 * The message that signals that a game is ready to start.
	 */
	GAME_READY_TO_START_LISTENER = 'GAME_READY_TO_START_LISTENER',
	/**
	 * The message that signals that a match was started.
	 */
	MATCH_STARTED_LISTENER = 'MATCH_STARTED_LISTENER',
	/**
	 * The message that signals that a turn changed.
	 */
	SHIFT_CHANGED_LISTENER = 'SHIFT_CHANGED_LISTENER',
	/**
	 * The message that signals that a deck of cards was refilled.
	 */
	CARD_DECK_FILLED_LISTENER = 'CARD_DECK_FILLED_LISTENER',
	/**
	 * The message that signals that a card was taken from the discarded cards.
	 */
	CARD_PULLED_FROM_DISCARDED_LISTENER = 'CARD_PULLED_FROM_DISCARDED_LISTENER',
	/**
	 * The message that signals that a player could not win.
	 */
	PLAYER_CANT_WIN_LISTENER = 'PLAYER_CANT_WIN_LISTENER',
	/**
	 * The message that signals that a round was closed and settled.
	 */
	MATCH_WON_LISTENER = 'MATCH_WON_LISTENER',
	/**
	 * The message that signals that a player drew a card from the deck (without revealing which).
	 */
	CARD_PULLED_FROM_DECK_LISTENER = 'CARD_PULLED_FROM_DECK_LISTENER',
	/**
	 * The message that signals that a player knocked: the extra round starts (Apuntado mode).
	 */
	PLAYER_KNOCKED_LISTENER = 'PLAYER_KNOCKED_LISTENER',
	/**
	 * The message that signals that a new round started (multi-round mode).
	 */
	ROUND_STARTED_LISTENER = 'ROUND_STARTED_LISTENER',
	/**
	 * The message that signals that the match ended and the pot was paid.
	 */
	GAME_FINISHED_LISTENER = 'GAME_FINISHED_LISTENER',
	/**
	 * The private message (`user:{id}` room) with the player's hand.
	 */
	PRIVATE_HAND_LISTENER = 'PRIVATE_HAND_LISTENER',
}
