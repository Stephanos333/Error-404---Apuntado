import {CSSProperties, JSX} from 'react';
import {GameType} from '../../../../types/game.type.ts';
import {PlayerWithUserType} from '../../../../types/player-with-user.type.ts';
import {PublicMatchView, PublicPlayerView} from '../../../../types/match.type.ts';
import {buildProfileImageRoute} from '../../../../utils/profile-image.utils.ts';
import {CardBackComponent} from '../../../../components/card/card.component.tsx';
import {CrownIconComponent} from '../../../../components/crown/crown.component.tsx';
import './opponents.component.css';

/** Elimination limit in Apuntado. */
export const ELIMINATION_LIMIT: number = 101;

/**
 * Orders players by seat starting with the one after `myId`, i.e. in turn order as seen
 * from the current user's chair.
 * @param {PublicPlayerView[]} players Match players.
 * @param {string | null} myId The current user.
 */
export function seatOrder(players: PublicPlayerView[], myId: string | null): PublicPlayerView[] {
    const sorted = [...players].sort((a, b) => a.position - b.position);
    const mine = sorted.findIndex((p) => p.playerId === myId);
    return mine < 0 ? sorted : [...sorted.slice(mine + 1), ...sorted.slice(0, mine)];
}

/**
 * Opponents around the top of the table: avatar, hand size as card backs, score and state.
 * @param props.match The public match view.
 * @param props.players Table players (for the icons).
 * @param props.game The table (to mark the host).
 * @param props.myId The current user.
 */
export function OpponentsComponent(props: {
    match: PublicMatchView | undefined;
    players: PlayerWithUserType[] | undefined;
    game: GameType | undefined;
    myId: string | null;
}): JSX.Element {
    const {match} = props;
    if (!match) return <div className='opponents'/>;

    const turnId: string | undefined = match.round?.turn.playerId;
    const knockerId: string | undefined = match.round?.extraRound?.knockerId;
    const pending: string[] = match.round?.extraRound?.pending ?? [];
    const isApuntado: boolean = match.mode === 'apuntado';

    return (
        <ul className='opponents' aria-label='Rivales'>
            {seatOrder(match.players, props.myId).map((player) => {
                const icon: string | undefined = props.players?.find((p) => p.userId === player.playerId)?.icon;
                const isTurn: boolean = player.playerId === turnId && match.status === 'IN_PROGRESS';
                const eliminated: boolean = player.status === 'ELIMINATED';
                const backs: number = Math.min(player.cardsInHand, 11);
                const progress: number = Math.max(0, Math.min(1, player.score / ELIMINATION_LIMIT));
                return (
                    <li
                        key={player.playerId}
                        className={`opponent ${isTurn ? 'is-turn' : ''} ${eliminated ? 'is-eliminated' : ''} ${player.connected ? '' : 'is-offline'}`}
                        aria-current={isTurn ? 'true' : undefined}
                    >
                        <div className='opponent-hand' aria-hidden='true'>
                            {Array.from({length: backs}, (_, i) => (
                                <CardBackComponent key={i} style={{'--i': i - (backs - 1) / 2, '--d': `${Math.abs(i - (backs - 1) / 2)}px`} as CSSProperties}/>
                            ))}
                        </div>
                        <div className='opponent-avatar'>
                            {icon ? <img alt='' src={buildProfileImageRoute(icon)}/> : <span className='opponent-avatar-blank'/>}
                            {isTurn ? <span className='opponent-turn-badge'>Jugando</span> : <></>}
                        </div>
                        <div className='opponent-info'>
                            <span className='opponent-name'>
                                {props.game?.hostId === player.playerId ? <CrownIconComponent size={14}/> : <></>}
                                <span>{player.username}</span>
                            </span>
                            <span className='opponent-meta'>
                                {eliminated
                                    ? 'Eliminado'
                                    : <><span className='num'>{player.cardsInHand}</span> cartas</>}
                                {player.connected ? '' : ' · sin conexión'}
                            </span>
                            {
                                isApuntado
                                    ? <span className='opponent-score' title={`${player.score} de ${ELIMINATION_LIMIT} puntos`}>
                                        <span className='opponent-score-bar'><span style={{width: `${progress * 100}%`}} className={progress > 0.75 ? 'is-danger' : ''}/></span>
                                        <span className='num'>{player.score}</span>
                                    </span>
                                    : <></>
                            }
                            {knockerId === player.playerId ? <span className='opponent-tag'>Tocó</span> : <></>}
                            {pending.includes(player.playerId) && !isTurn ? <span className='opponent-tag opponent-tag-soft'>Último turno</span> : <></>}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
