/**
 * @enum {string} Constants with the configuration of
 * the card design controllers.
 */
export enum CardDesignControllerConstants {
	/**
	 * Prefix used by every card design controller.
	 */
	CONTROLLER_PREFIX = 'card-design',
	/**
	 * Tag that groups every card design controller.
	 */
	CONTROLLER_TAG = 'Card Design',
	/**
	 * Url of the controller that fetches the active card
	 * designs.
	 */
	GET_ACTIVE_CARD_DESIGNS_URL = 'active',
	/**
	 * Url of the controller that fetches the user's current
	 * design.
	 */
	GET_CURRENT_CARD_DESIGN = 'current',
}