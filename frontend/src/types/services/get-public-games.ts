import {GameType} from '../game.type.ts';

/**
 * Response of the public games service.
 */
export type GetPublicGamesResponse = {
    success: boolean,
    data: Array<GameType>
}