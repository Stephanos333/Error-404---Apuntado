import {GameType} from '../game.type.ts';

/**
 * Request to create a game.
 */
export type CreateGameRequest = {
    requiredPlayers: number;
    isPublic: boolean;
    betByPlayer: number;
    name: string;
    /** Game mode (rule plug-in): `classic` or `apuntado`. */
    ruleId?: string;
}

/**
 * Response of the create-game service.
 */
export type CreateGameResponse = {
    success: boolean;
    data: GameType;
}
