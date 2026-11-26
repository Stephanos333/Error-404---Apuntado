/**
 * @enum {string} Constants related to the project database.
 * @readonly
 */
export enum DatabaseConstants {
	/**
	 * Name of the database
	 * connection.
	 */
	DATABASE_CONNECTION_NAME = 'DATABASE_CONNECTION_NAME',
	/**
	 * Name of the card designs collection
	 * in the database.
	 */
	CARD_DESIGN_COLLECTION_NAME = 'Card-design',
	/**
	 * Provider of the card designs schema.
	 */
	CARD_DESIGN_PROVIDER = 'CARD_DESIGN_PROVIDER',
	/**
	 * Name of the games collection
	 * in the database.
	 */
	GAME_COLLECTION_NAME = 'Game',
	/**
	 * Provider of the games schema.
	 */
	GAME_PROVIDER = 'GAME_PROVIDER',
	/**
	 * Collection of the Match aggregate (ADR-04, `docs/schemas/matches.schema.json`).
	 */
	MATCHES_COLLECTION_NAME = 'matches',
	/**
	 * Collection of the token ledger (ADR-04, `docs/schemas/token_ledger.schema.json`).
	 */
	TOKEN_LEDGER_COLLECTION_NAME = 'token_ledger',
	/**
	 * Name of the players collection
	 * in the database.
	 */
	PLAYER_COLLECTION_NAME = 'Player',
	/**
	 * Provider of the players schema.
	 */
	PLAYER_PROVIDER = 'PLAYER_PROVIDER',
	/**
	 * Name of the users collection
	 * in the database.
	 */
	USER_COLLECTION_NAME = 'User',
	/**
	 * Provider of the users schema.
	 */
	USER_PROVIDER = 'USER_PROVIDER',
}