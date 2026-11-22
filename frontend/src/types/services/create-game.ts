import {GameType} from '../game.type.ts';

/**
 * Definición de los datos necesarios para crear un juego.
 */
export type CreateGameRequest = {
    requiredPlayers: number;
    isPublic: boolean;
    betByPlayer: number;
    name: string;
    /** Modalidad del juego (plug-in de reglas): `clasica` o `apuntado`. */
    ruleId?: string;
}

/**
 * Definición de la respuesta del servicio para crear un juego.
 */
export type CreateGameResponse = {
    success: boolean;
    data: GameType;
}
