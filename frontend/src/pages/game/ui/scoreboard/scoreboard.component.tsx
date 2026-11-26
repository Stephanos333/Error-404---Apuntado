import {JSX} from 'react';
import {PlayerWithUserType} from '../../../../types/player-with-user.type.ts';
import {PublicMatchView} from '../../../../types/match.type.ts';
import {buildProfileImageRoute} from '../../../../utils/profile-image.utils.ts';
import {TokenAmountComponent} from '../../../../components/token/token.component.tsx';
import {ELIMINATION_LIMIT} from '../opponents/opponents.component.tsx';
import './scoreboard.component.css';

/** Readable close type. */
const CLOSE_NAME: Record<string, string> = {WIN_4_3_3: '4-3-3', KNOCK: 'Tocó'};

/**
 * Scoreboard: pot, standings and the points of every finished round.
 * @param props.match The public match view.
 * @param props.players Table players (for the icons).
 * @param props.myId The current user.
 */
export function ScoreboardComponent(props: {
    match: PublicMatchView | undefined;
    players: PlayerWithUserType[] | undefined;
    myId: string | null;
}): JSX.Element {
    const {match} = props;
    if (!match) return <div className='scoreboard'/>;

    const isApuntado: boolean = match.mode === 'apuntado';
    const iconOf = (id: string): string | undefined => props.players?.find((p) => p.userId === id)?.icon;
    const nameOf = (id: string): string => match.players.find((p) => p.playerId === id)?.username ?? '—';
    const standings = [...match.players].sort((a, b) =>
        (a.status === 'ELIMINATED' ? 1 : 0) - (b.status === 'ELIMINATED' ? 1 : 0) || a.score - b.score);
    const columns = [...match.players].sort((a, b) => a.position - b.position);
    const turnId: string | undefined = match.round?.turn.playerId;

    return (
        <div className='scoreboard'>
            <section className='scoreboard-pot'>
                <span>Pozo</span>
                <TokenAmountComponent amount={match.pot.total} size='lg' label='fichas en el pozo'/>
                <p className='muted'>{isApuntado ? 'Lo gana el último que quede o quien baje a −51.' : 'Lo gana quien cierre primero con 4-3-3.'}</p>
            </section>

            <section className='scoreboard-section' aria-labelledby='scoreboard-standings'>
                <h3 id='scoreboard-standings'>{isApuntado ? 'Puntos' : 'Jugadores'}</h3>
                <ol className='scoreboard-standings'>
                    {standings.map((player) => {
                        const icon = iconOf(player.playerId);
                        const eliminated = player.status === 'ELIMINATED';
                        return (
                            <li key={player.playerId} className={`${eliminated ? 'is-eliminated' : ''} ${player.playerId === props.myId ? 'is-me' : ''}`}>
                                {icon ? <img alt='' src={buildProfileImageRoute(icon)}/> : <span className='scoreboard-avatar-blank'/>}
                                <span className='scoreboard-name'>
                                    {player.username}
                                    {player.playerId === props.myId ? <small> (tú)</small> : <></>}
                                    {player.playerId === turnId && match.status === 'IN_PROGRESS' ? <small className='scoreboard-turn'> · jugando</small> : <></>}
                                </span>
                                {
                                    isApuntado
                                        ? <span className='scoreboard-points'>
                                            <span className='num'>{player.score}</span>
                                            <small>{eliminated ? 'fuera' : `faltan ${Math.max(0, ELIMINATION_LIMIT - player.score)}`}</small>
                                        </span>
                                        : <span className='scoreboard-points'><span className='num'>{player.cardsInHand}</span><small>cartas</small></span>
                                }
                            </li>
                        );
                    })}
                </ol>
            </section>

            {
                match.scoreboard.length > 0
                    ? <section className='scoreboard-section' aria-labelledby='scoreboard-rounds'>
                        <h3 id='scoreboard-rounds'>Rondas</h3>
                        <div className='scoreboard-table-wrap'>
                            <table className='scoreboard-table'>
                                <thead>
                                    <tr>
                                        <th scope='col'>#</th>
                                        {columns.map((p) => {
                                            const icon = iconOf(p.playerId);
                                            return (
                                                <th key={p.playerId} scope='col' title={p.username}>
                                                    {icon ? <img alt={p.username} src={buildProfileImageRoute(icon)}/> : p.username.slice(0, 2)}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {match.scoreboard.map((entry) => (
                                        <tr key={entry.roundNumber}>
                                            <th scope='row' title={`Ganó ${nameOf(entry.winnerId)} (${CLOSE_NAME[entry.closeType] ?? entry.closeType})`}>{entry.roundNumber}</th>
                                            {columns.map((p) => {
                                                const score = entry.points.find((x) => x.playerId === p.playerId);
                                                const won = entry.winnerId === p.playerId;
                                                return (
                                                    <td key={p.playerId} className={`${won ? 'is-winner' : ''} ${score?.eliminated ? 'is-out' : ''}`}>
                                                        {score ? <span className='num'>{score.roundPoints > 0 ? `+${score.roundPoints}` : score.roundPoints}</span> : '—'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className='scoreboard-legend muted'>Resaltado: quien cerró la ronda.</p>
                    </section>
                    : <></>
            }
        </div>
    );
}
