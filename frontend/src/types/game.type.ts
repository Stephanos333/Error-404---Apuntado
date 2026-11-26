/**
 * A game table.
 */
export type GameType = {
    gameId: string;
    creatorId: string;
    hostId: string;
    status: string;
    name: string;
    requiredPlayers: number;
    currentPlayers: number;
    betByPlayer: number;
    isPublic: boolean;
    wasInitiated: boolean;
    /** Mode (rule plug-in): `clasica` or `apuntado`. */
    ruleId?: string;
    /** `_id` of the `partidas` aggregate once the game has started. */
    partidaId?: string;
}
