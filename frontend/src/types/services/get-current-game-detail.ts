import {GameType} from '../game.type.ts';
import {PlayerWithUserType} from '../player-with-user.type.ts';
import {PublicMatchView} from '../match.type.ts';

/**
 * Response of the current game detail service.
 */
export type GetCurrentGameDetailResponse = {
    success: boolean;
    game: GameType;
    players: PlayerWithUserType[];
    /** Public view of the match in progress (no private cards). */
    match?: PublicMatchView;
}
