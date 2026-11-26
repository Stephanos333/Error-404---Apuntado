/**
 * @enum {string} Constants with the configuration of the game
 * controllers.
 * @readonly
 */
export enum GameControllerConstants {
	/**
	 * Prefix used by every game controller.
	 */
	CONTROLLER_PREFIX = 'game',
	/**
	 * Tag that groups every game controller.
	 */
	CONTROLLER_TAG = 'Game',
	/**
	 * Url of the controller that fetches the detail of the current game.
	 */
	GET_CURRENT_GAME_DETAIL_URL = 'current',
	/**
	 * Url of the controller that fetches every public game.
	 */
	GET_PUBLIC_GAMES_URL = 'public',
	/**
	 * Url of the controller that lets a user join
	 * a game.
	 */
	JOIN_GAME_URL = 'join',
}