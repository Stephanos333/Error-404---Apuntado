/**
 * @enum {string} The error messages of the application.
 * @readonly
 */
export enum ExceptionMessagesConstants {
	/**
	 * Used when the "betByPlayer" parameter is required and not sent.
	 */
	BET_BY_PLAYER_IS_REQUIRED_ERROR = 'BET_BY_PLAYER_IS_REQUIRED_ERROR',
	/**
	 * Used when the "betByPlayer" parameter is validated and is not a valid number.
	 */
	BET_BY_PLAYER_MUST_BE_A_INTEGER_ERROR = 'BET_BY_PLAYER_MUST_BE_A_INTEGER_ERROR',
	/**
	 * Used when the "betByPlayer" parameter is validated and is not within the
	 * range specified by the system.
	 */
	BET_BY_PLAYER_MUST_BE_GREATER_THAN_0_ERROR = 'BET_BY_PLAYER_MUST_BE_GREATER_THAN_0_ERROR',
	/**
	 * Used when the "cardDesignId" parameter is required and not sent.
	 */
	CARD_DESIGN_ID_IS_REQUIRED_ERROR = 'CARD_DESIGN_ID_IS_REQUIRED_ERROR',
	/**
	 * Used when the ID of a card design is not
	 * a string.
	 */
	CARD_DESIGN_ID_MUST_BE_A_STRING_ERROR = 'CARD_DESIGN_ID_MUST_BE_A_STRING_ERROR',
	/**
	 * Used when a card design that does not exist is requested.
	 */
	CARD_DESIGN_NOT_FOUND_ERROR = 'CARD_DESIGN_NOT_FOUND_ERROR',
	/**
	 * Used when trying to use a card design that
	 * has not been bought.
	 */
	CARD_DESIGN_WITHOUT_PURCHASING_ERROR = 'CARD_DESIGN_WITHOUT_PURCHASING_ERROR',
	/**
	 * Signals that the suit of a card is required.
	 */
	CARD_SUIT_IS_REQUIRED_ERROR = 'CARD_SUIT_IS_REQUIRED_ERROR',
	/**
	 * Signals that the type of a card is required.
	 */
	CARD_TYPE_IS_REQUIRED_ERROR = 'CARD_TYPE_IS_REQUIRED_ERROR',
	/**
	 * Used when the requested card design does not exist.
	 */
	DEFAULT_CARD_DESIGN_NOT_FOUND_ERROR = 'DEFAULT_CARD_DESIGN_NOT_FOUND_ERROR',
	/**
	 * Used when a game cannot be started.
	 */
	GAME_CANNOT_BE_STARTED_ERROR = 'GAME_CANNOT_BE_STARTED_ERROR',
	/**
	 * Used when trying to add a player to a game that is already full.
	 */
	GAME_EXCEEDS_ITS_PLAYER_COUNT_ERROR = 'GAME_EXCEEDS_ITS_PLAYER_COUNT_ERROR',
	/**
	 * Used when trying to join a game that
	 * has already started.
	 */
	GAME_IS_ALREADY_STARTED = 'GAME_IS_ALREADY_STARTED',
	/**
	 * Used when the ID of a game is required and not sent.
	 */
	GAME_ID_IS_REQUIRED_ERROR = 'GAME_ID_IS_REQUIRED_ERROR',
	/**
	 * Used when the ID of a game is validated and is not a string.
	 */
	GAME_ID_MUST_BE_A_STRING_ERROR = 'GAME_ID_MUST_BE_A_STRING_ERROR',
	/**
	 * Used when trying to access the resources of a game
	 * that has already finished.
	 */
	GAME_IS_ALREADY_FINISHED_ERROR = 'GAME_IS_ALREADY_FINISHED_ERROR',
	/**
	 * Used when the name of a game is required and not sent.
	 */
	GAME_NAME_IS_REQUIRED_ERROR = 'GAME_NAME_IS_REQUIRED_ERROR',
	/**
	 * Used when the name of a game is validated and is not a string.
	 */
	GAME_NAME_MUST_BE_A_STRING_ERROR = 'GAME_NAME_MUST_BE_A_STRING_ERROR',
	/**
	 * Used when a game that does not exist is requested.
	 */
	GAME_NOT_FOUND_ERROR = 'GAME_NOT_FOUND_ERROR',
	/**
	 * Used when the update of a game is requested
	 * but something fails.
	 */
	GAME_NOT_UPDATED_ERROR = 'GAME_NOT_UPDATED_ERROR',
	/**
	 * Used to express a server error that
	 * must not be communicated to the end user.
	 */
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
	/**
	 * Used when a card design ID does not meet the requirements
	 * of the system.
	 */
	INVALID_CARD_DESIGN_ID_ERROR = 'INVALID_CARD_DESIGN_ID_ERROR',
	/**
	 * Used when the suit of a card is not in the
	 * constants file.
	 */
	INVALID_CARD_SUIT_ERROR = 'INVALID_CARD_SUIT_ERROR',
	/**
	 * Used when the type of a card is not in
	 * the constants file.
	 */
	INVALID_CARD_TYPE_ERROR = 'INVALID_CARD_TYPE_ERROR',
	/**
	 * Used when the login credentials of a user are not
	 * valid.
	 */
	INVALID_CREDENTIALS_ERROR = 'INVALID_CREDENTIALS_ERROR',
	/**
	 * Used when a game ID does not meet the
	 * requirements of the system.
	 */
	INVALID_GAME_ID_ERROR = 'INVALID_GAME_ID_ERROR',
	/**
	 * Used when the number of players required
	 * for a game is not valid.
	 */
	INVALID_GAME_REQUIRED_PLAYERS_ERROR = 'INVALID_GAME_REQUIRED_PLAYERS_ERROR',
	/**
	 * Used when trying to create a game with a rule (plug-in)
	 * that is not registered.
	 */
	INVALID_GAME_RULE_ERROR = 'INVALID_GAME_RULE_ERROR',
	/**
	 * Used when the "ruleId" parameter is validated and is not a string.
	 */
	GAME_RULE_MUST_BE_A_STRING_ERROR = 'GAME_RULE_MUST_BE_A_STRING_ERROR',
	/**
	 * Used when a match (`matches` aggregate) that does not exist is requested.
	 */
	MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
	/**
	 * Used when a command arrives after the round (or the match) is already closed.
	 */
	ROUND_ALREADY_CLOSED = 'ROUND_ALREADY_CLOSED',
	/**
	 * Used when a player tries to act out of turn.
	 */
	NOT_YOUR_TURN = 'NOT_YOUR_TURN',
	/**
	 * Used when the command is based on a version of the match that already changed
	 * (optimistic concurrency control): the client must request the current state.
	 */
	STALE_VERSION = 'STALE_VERSION',
	/**
	 * Used when the action does not match the turn phase
	 * (e.g. drawing twice or discarding without drawing).
	 */
	INVALID_TURN_PHASE = 'INVALID_TURN_PHASE',
	/**
	 * Used when the index of a card does not exist in the player's hand.
	 */
	CARD_NOT_IN_HAND = 'CARD_NOT_IN_HAND',
	/**
	 * Used when the sent group organization is not valid
	 * (repeated indexes, out of range or groups of a size that is not allowed).
	 */
	INVALID_GROUPS = 'INVALID_GROUPS',
	/**
	 * Used when trying to draw from the discard pile while it is empty.
	 */
	EMPTY_DISCARD_PILE = 'EMPTY_DISCARD_PILE',
	/**
	 * Used when there are no cards left to draw in the deck or the discard pile.
	 */
	EMPTY_DECK = 'EMPTY_DECK',
	/**
	 * Used when the player already tried to close in their current turn.
	 */
	CLOSE_ALREADY_ATTEMPTED = 'CLOSE_ALREADY_ATTEMPTED',
	/**
	 * Used when the game rule does not allow the requested close type
	 * (e.g. knocking in Classic or knocking again during the extra round).
	 */
	CLOSE_NOT_ALLOWED = 'CLOSE_NOT_ALLOWED',
	/**
	 * Used when the user is not a player of the match.
	 */
	PLAYER_NOT_IN_MATCH = 'PLAYER_NOT_IN_MATCH',
	/**
	 * Used when the "version" parameter is validated and is not a valid integer.
	 */
	VERSION_MUST_BE_A_NON_NEGATIVE_INTEGER_ERROR = 'VERSION_MUST_BE_A_NON_NEGATIVE_INTEGER_ERROR',
	/**
	 * Used when the "commandId" parameter is validated and is not valid.
	 */
	INVALID_COMMAND_ID_ERROR = 'INVALID_COMMAND_ID_ERROR',
	/**
	 * Used when the status of a game is not in
	 * the constants file.
	 */
	INVALID_GAME_STATUS_ERROR = 'INVALID_GAME_STATUS_ERROR',
	/**
	 * Used when the ID of a match does not meet the requirements of the system.
	 */
	INVALID_MATCH_ID_ERROR = 'INVALID_MATCH_ID_ERROR',
	/**
	 * Signals that the status of a match is not valid.
	 */
	INVALID_MATCH_STATUS_ERROR = 'INVALID_MATCH_STATUS_ERROR',
	/**
	 * Used when the password of a user does not meet
	 * the requirements of the system.
	 */
	INVALID_PASSWORD_ERROR = 'INVALID_PASSWORD_ERROR',
	/**
	 * Used when a player ID does not meet the requirements
	 * of the system.
	 */
	INVALID_PLAYER_ID_ERROR = 'INVALID_PLAYER_ID_ERROR',
	/**
	 * Used when the status of a player is not valid.
	 */
	INVALID_PLAYER_STATUS_ERROR = 'INVALID_PLAYER_STATUS_ERROR',
	/**
	 * Used when the refresh token of a user is not valid.
	 */
	INVALID_REFRESH_TOKEN_ERROR = 'INVALID_REFRESH_TOKEN_ERROR',
	/**
	 * Used when the icon of a user does not meet the
	 * requirements of the system.
	 */
	INVALID_USER_ICON_ERROR = 'INVALID_USER_ICON_ERROR',
	/**
	 * Used when a user ID does not meet the
	 * requirements of the system.
	 */
	INVALID_USER_ID_ERROR = 'INVALID_USER_ID_ERROR',
	/**
	 * Used when the status of a user is not in
	 * the constants file.
	 */
	INVALID_USER_STATUS_ERROR = 'INVALID_USER_STATUS_ERROR',
	/**
	 * Signals that a player's leftover is required.
	 */
	KICKER_IS_REQUIRED_ERROR = 'KICKER_IS_REQUIRED_ERROR',
	/**
	 * Used when the "isPublic" parameter is required and not sent.
	 */
	IS_PUBLIC_IS_REQUIRED_ERROR = 'IS_PUBLIC_IS_REQUIRED_ERROR',
	/**
	 * Used when the "isPublic" parameter is validated and is not a boolean.
	 */
	IS_PUBLIC_MUST_BE_A_BOOLEAN_ERROR = 'IS_PUBLIC_MUST_BE_A_BOOLEAN_ERROR',
	/**
	 * Used when a match cannot be started.
	 */
	MATCH_CANNOT_BE_STARTED_ERROR = 'MATCH_CANNOT_BE_STARTED_ERROR',
	/**
	 * Signals that a requested match was not found.
	 */
	MATCH_NOT_FOUND_ERROR = 'MATCH_NOT_FOUND_ERROR',
	/**
	 * Signals that there are no discarded cards.
	 */
	NO_DISCARDED_CARDS_ERROR = 'NO_DISCARDED_CARDS_ERROR',
	/**
	 * Used when a user tries to perform a token operation
	 * and does not have enough.
	 */
	NOT_ENOUGH_TOKENS_ERROR = 'NOT_ENOUGH_TOKENS_ERROR',
	/**
	 * Reports that three 1 can only have 3 cards.
	 */
	ONLY_3_CARDS_ARE_REQUIRED_IN_TRIPS_1_ERROR = 'ONLY_3_CARDS_ARE_REQUIRED_IN_TRIPS_1_ERROR',
	/**
	 * Reports that three 2 can only have 3 cards.
	 */
	ONLY_3_CARDS_ARE_REQUIRED_IN_TRIPS_2_ERROR = 'ONLY_3_CARDS_ARE_REQUIRED_IN_TRIPS_2_ERROR',
	/**
	 * Reports that the four can only have 4 cards.
	 */
	ONLY_4_CARDS_ARE_REQUIRED_IN_QUADS_ERROR = 'ONLY_4_CARDS_ARE_REQUIRED_IN_QUADS_ERROR',
	/**
	 * Used when a user tries to start a game they did not create.
	 */
	ONLY_GAME_HOST_CAN_START_THE_MATCH_ERROR = 'ONLY_GAME_HOST_CAN_START_THE_MATCH_ERROR',
	/**
	 * Used when a password is required and not sent.
	 */
	PASSWORD_IS_REQUIRED_ERROR = 'PASSWORD_IS_REQUIRED_ERROR',
	/**
	 * Used when a password is validated and is not a string.
	 */
	PASSWORD_MUST_BE_A_STRING_ERROR = 'PASSWORD_MUST_BE_A_STRING_ERROR',
	/**
	 * Used when a player tries to draw a card and has already done it.
	 */
	PLAYER_ALREADY_PULL_CARD_ERROR = 'PLAYER_ALREADY_PULL_CARD_ERROR',
	/**
	 * Used when a player does not have a given card.
	 */
	PLAYER_DOES_NOT_HAVE_THIS_CARD_ERROR = 'PLAYER_DOES_NOT_HAVE_THIS_CARD_ERROR',
	/**
	 * Used when a player that does not exist is requested.
	 */
	PLAYER_NOT_FOUND_ERROR = 'PLAYER_NOT_FOUND_ERROR',
	/**
	 * Used when a refresh token is required and not sent.
	 */
	REFRESH_TOKEN_IS_REQUIRED_ERROR = 'REFRESH_TOKEN_IS_REQUIRED_ERROR',
	/**
	 * Used when a refresh token is validated and is not a string.
	 */
	REFRESH_TOKEN_MUST_BE_A_STRING_ERROR = 'REFRESH_TOKEN_MUST_BE_A_STRING_ERROR',
	/**
	 * Used when the "requiredPlayers" parameter is required and not sent.
	 */
	REQUIRED_PLAYERS_IS_REQUIRED_ERROR = 'REQUIRED_PLAYERS_IS_REQUIRED_ERROR',
	/**
	 * Used when the "requiredPlayers" parameter is validated and is not a valid number
	 */
	REQUIRED_PLAYERS_MUST_BE_A_INTEGER_ERROR = 'REQUIRED_PLAYERS_MUST_BE_A_INTEGER_ERROR',
	/**
	 * Used when the "requiredPlayers" parameter is validated and is not
	 * within the range defined by the system.
	 */
	REQUIRED_PLAYERS_MUST_BE_IN_RANGE_ERROR = 'REQUIRED_PLAYERS_MUST_BE_IN_RANGE_ERROR',
	/**
	 * Message that signals that a request is not authorized.
	 */
	UNAUTHORIZED = 'UNAUTHORIZED',
	/**
	 * Used when trying to create a user that already exists.
	 */
	USER_ALREADY_EXISTS_ERROR = 'USER_ALREADY_EXISTS_ERROR',
	/**
	 * Signals that the icon of a user must be a string.
	 */
	USER_ICON_MUST_BE_A_STRING = 'USER_ICON_MUST_BE_A_STRING',
	/**
	 * Signals that the icon of a user is required.
	 */
	USER_ICON_IS_REQUIRED = 'USER_ICON_IS_REQUIRED',
	/**
	 * Used when trying to change the status of a user to playing
	 * while they are already playing.
	 */
	USER_IS_ALREADY_PLAYING_ERROR = 'USER_IS_ALREADY_PLAYING_ERROR',
	/**
	 * Used when a user tries to access the resources of a
	 * game they are not playing.
	 */
	USER_IS_NOT_PART_OF_A_GAME_ERROR = 'USER_IS_NOT_PART_OF_A_GAME_ERROR',
	/**
	 * Used when a user that does not exist is requested.
	 */
	USER_NOT_FOUND_ERROR = 'USER_NOT_FOUND_ERROR',
	/**
	 * Used when the update of a user is requested but something fails.
	 */
	USER_NOT_UPDATED_ERROR = 'USER_NOT_UPDATED_ERROR',
	/**
	 * Signals that a player cannot try to win any more.
	 */
	PLAYER_CAN_NO_LONGER_TRY_TO_WIN_ERROR = 'PLAYER_CAN_NO_LONGER_TRY_TO_WIN_ERROR',
	/**
	 * Used when the cards of a player do not let them win.
	 */
	PLAYER_CARDS_DONT_ALLOW_WINNING_ERROR = 'PLAYER_CARDS_DONT_ALLOW_WINNING_ERROR',
	/**
	 * Used when a player has not drawn a card yet.
	 */
	PLAYER_HAS_NOT_PULLED_CARD_ERROR = 'PLAYER_HAS_NOT_PULLED_CARD_ERROR',
	/**
	 * Used when a username is required and not sent.
	 */
	USERNAME_IS_REQUIRED_ERROR = 'USERNAME_IS_REQUIRED_ERROR',
	/**
	 * Used when a username is validated and is not a string.
	 */
	USERNAME_MUST_BE_A_STRING_ERROR = 'USERNAME_MUST_BE_A_STRING_ERROR',
}
