/**
 * @enum {string} Game table statuses.
 * @readonly
 */
export enum GameConstants {
    /** The table is full and ready to start. */
    GAME_STATUS_WAITING_TO_START = 'WAITING_TO_START',
    /** The match is being played. */
    GAME_STATUS_ACTIVE = 'ACTIVE'
}