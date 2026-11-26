/**
 * Socket.IO room names (ADR-05, R04).
 *
 * - `match:{roomId}`: PUBLIC room of the table. It only receives the public view.
 * - `user:{userId}`: PRIVATE room of a user. It only receives their hand.
 *
 * `roomId` is the id of the game (waiting room), stable before and during the match.
 */
export const PUBLIC_ROOM_PREFIX = 'match:';
export const PRIVATE_ROOM_PREFIX = 'user:';

/** Public room of the table. */
export const publicRoom = (roomId: string): string => `${PUBLIC_ROOM_PREFIX}${roomId}`;

/** Private room of a user. */
export const privateRoom = (userId: string): string => `${PRIVATE_ROOM_PREFIX}${userId}`;
