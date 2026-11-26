/**
 * @enum {string} Constants with the configuration of
 * the user controllers.
 * @readonly
 */
export enum UserControllerConstants {
	/**
	 * Prefix used by every user controller.
	 */
	CONTROLLER_PREFIX = 'user',
	/**
	 * Tag that groups every user controller.
	 */
	CONTROLLER_TAG = 'User',
	/**
	 * Url of the controller that returns the user.
	 */
	GET_ME_URL = 'me',
	/**
	 * Url of the controller that updates the user's card
	 * design.
	 */
	UPDATE_USER_CARD_DESIGN_URL = 'card-design',
	/**
	 * Url of the controller that updates the icon of a user.
	 */
	UPDATE_USER_ICON = 'icon',
}