import {GameType} from '../game.type.ts';
import {PlayerWithUserType} from '../player-with-user.type.ts';
import {VistaPublicaPartida} from '../partida.type.ts';

/**
 * La respuesta del servicio para obtener el detalle del juego actual.
 */
export type GetCurrentGameDetailResponse = {
    success: boolean;
    game: GameType;
    players: PlayerWithUserType[];
    /** Vista pública de la partida en curso (sin cartas privadas). */
    partida?: VistaPublicaPartida;
}
