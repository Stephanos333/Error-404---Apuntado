/**
 * @enum {string} Constants with the configuration of
 * the session controllers.
 * @readonly
 */
export enum SessionControllerConstants {
	/**
	 * Prefix used by every session controller of the application.
	 */
	CONTROLLER_PREFIX = 'session',
	/**
	 * Tag that groups every session controller of the application.
	 */
	CONTROLLER_TAG = 'Session',
	/**
	 * Url of the login controller.
	 */
	LOGIN_URL = 'login',
	/**
	 * Url of the controller that refreshes the user's token.
	 */
	REFRESH_TOKEN_URL = 'refresh-token',
}