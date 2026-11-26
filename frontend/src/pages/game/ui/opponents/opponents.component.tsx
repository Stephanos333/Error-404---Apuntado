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
    const sorted = [...players].sort((a, b) => a.posicion - b.posicion);
    const mine = sorted.findIndex((p) => p.jugadorId === myId);
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

    const turnId: string | undefined = match.ronda?.turno.jugadorId;
    const knockerId: string | undefined = match.ronda?.rondaExtra?.tocadorId;
    const pending: string[] = match.ronda?.rondaExtra?.pendientes ?? [];
    const isApuntado: boolean = match.modalidad === 'apuntado';

    return (
        <ul className='opponents' aria-label='Rivales'>
            {seatOrder(match.jugadores, props.myId).map((player) => {
                const icon: string | undefined = props.players?.find((p) => p.userId === player.jugadorId)?.icon;
                const isTurn: boolean = player.jugadorId === turnId && match.estado === 'EN_JUEGO';
                const eliminated: boolean = player.estado === 'ELIMINADO';
                const backs: number = Math.min(player.cartasEnMano, 11);
                const progress: number = Math.max(0, Math.min(1, player.puntaje / ELIMINATION_LIMIT));
                return (
                    <li
                        key={player.jugadorId}
                        className={`opponent ${isTurn ? 'is-turn' : ''} ${eliminated ? 'is-eliminated' : ''} ${player.conectado ? '' : 'is-offline'}`}
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
                                {props.game?.hostId === player.jugadorId ? <CrownIconComponent size={14}/> : <></>}
                                <span>{player.nombreUsuario}</span>
                            </span>
                            <span className='opponent-meta'>
                                {eliminated
                                    ? 'Eliminado'
                                    : <><span className='num'>{player.cartasEnMano}</span> cartas</>}
                                {player.conectado ? '' : ' · sin conexión'}
                            </span>
                            {
                                isApuntado
                                    ? <span className='opponent-score' title={`${player.puntaje} de ${ELIMINATION_LIMIT} puntos`}>
                                        <span className='opponent-score-bar'><span style={{width: `${progress * 100}%`}} className={progress > 0.75 ? 'is-danger' : ''}/></span>
                                        <span className='num'>{player.puntaje}</span>
                                    </span>
                                    : <></>
                            }
                            {knockerId === player.jugadorId ? <span className='opponent-tag'>Tocó</span> : <></>}
                            {pending.includes(player.jugadorId) && !isTurn ? <span className='opponent-tag opponent-tag-soft'>Último turno</span> : <></>}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
