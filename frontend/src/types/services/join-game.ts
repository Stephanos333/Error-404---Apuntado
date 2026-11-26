import {GameType} from '../game.type.ts';

/**
 * Request to join a game.
 */
export type JoinGameRequest = {
    'gameId': string;
}

/**
 * Response of the join-game service.
 */
export type JoinGameResponse = {
    'success': boolean;
    'data': GameType;
}