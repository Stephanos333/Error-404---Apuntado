/**
 * @enum {string} User statuses.
 * @readonly
 */
export enum UserStatusConstants {
    /** Free to create or join a table. */
    ACTIVE = 'ACTIVE',
    /** Seated at a table (waiting or playing). */
    PLAYING = 'PLAYING',
}