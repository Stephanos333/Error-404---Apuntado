/**
 * Definición de los datos de los juegos.
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
    /** Modalidad (plug-in de reglas): `clasica` o `apuntado`. */
    ruleId?: string;
    /** `_id` del agregado `partidas` una vez iniciado el juego. */
    partidaId?: string;
}
