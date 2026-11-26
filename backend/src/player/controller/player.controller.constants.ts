/**
 * @enum {string} Configuration constants of the player controllers.
 * @readonly
 */
export enum PlayerControllerConstants {
	/**
	 * Prefix used by the player controllers.
	 */
	CONTROLLER_PREFIX = 'player',
	/**
	 * Tag that groups every game controller.
	 */
	CONTROLLER_TAG = 'Players',
	/**
	 * Url to fetch the current player of a user.
	 */
	GET_CURRENT_PLAYER_URL = 'current',
}
