import {JSX} from 'react';
import {PlayerWithUserType} from '../../../../types/player-with-user.type.ts';
import {PublicMatchView} from '../../../../types/match.type.ts';
import {buildProfileImageRoute} from '../../../../utils/profile-image.utils.ts';
import {TokenAmountComponent} from '../../../../components/token/token.component.tsx';
import {ELIMINATION_LIMIT} from '../opponents/opponents.component.tsx';
import './scoreboard.component.css';

/** Readable close type. */
const CLOSE_NAME: Record<string, string> = {GANAR_4_3_3: '4-3-3', TOCAR: 'Tocó'};

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

    const isApuntado: boolean = match.modalidad === 'apuntado';
    const iconOf = (id: string): string | undefined => props.players?.find((p) => p.userId === id)?.icon;
    const nameOf = (id: string): string => match.jugadores.find((p) => p.jugadorId === id)?.nombreUsuario ?? '—';
    const standings = [...match.jugadores].sort((a, b) =>
        (a.estado === 'ELIMINADO' ? 1 : 0) - (b.estado === 'ELIMINADO' ? 1 : 0) || a.puntaje - b.puntaje);
    const columns = [...match.jugadores].sort((a, b) => a.posicion - b.posicion);
    const turnId: string | undefined = match.ronda?.turno.jugadorId;

    return (
        <div className='scoreboard'>
            <section className='scoreboard-pot'>
                <span>Pozo</span>
                <TokenAmountComponent amount={match.pozo.total} size='lg' label='fichas en el pozo'/>
                <p className='muted'>{isApuntado ? 'Lo gana el último que quede o quien baje a −51.' : 'Lo gana quien cierre primero con 4-3-3.'}</p>
            </section>

            <section className='scoreboard-section' aria-labelledby='scoreboard-standings'>
                <h3 id='scoreboard-standings'>{isApuntado ? 'Puntos' : 'Jugadores'}</h3>
                <ol className='scoreboard-standings'>
                    {standings.map((player) => {
                        const icon = iconOf(player.jugadorId);
                        const eliminated = player.estado === 'ELIMINADO';
                        return (
                            <li key={player.jugadorId} className={`${eliminated ? 'is-eliminated' : ''} ${player.jugadorId === props.myId ? 'is-me' : ''}`}>
                                {icon ? <img alt='' src={buildProfileImageRoute(icon)}/> : <span className='scoreboard-avatar-blank'/>}
                                <span className='scoreboard-name'>
                                    {player.nombreUsuario}
                                    {player.jugadorId === props.myId ? <small> (tú)</small> : <></>}
                                    {player.jugadorId === turnId && match.estado === 'EN_JUEGO' ? <small className='scoreboard-turn'> · jugando</small> : <></>}
                                </span>
                                {
                                    isApuntado
                                        ? <span className='scoreboard-points'>
                                            <span className='num'>{player.puntaje}</span>
                                            <small>{eliminated ? 'fuera' : `faltan ${Math.max(0, ELIMINATION_LIMIT - player.puntaje)}`}</small>
                                        </span>
                                        : <span className='scoreboard-points'><span className='num'>{player.cartasEnMano}</span><small>cartas</small></span>
                                }
                            </li>
                        );
                    })}
                </ol>
            </section>

            {
                match.marcador.length > 0
                    ? <section className='scoreboard-section' aria-labelledby='scoreboard-rounds'>
                        <h3 id='scoreboard-rounds'>Rondas</h3>
                        <div className='scoreboard-table-wrap'>
                            <table className='scoreboard-table'>
                                <thead>
                                    <tr>
                                        <th scope='col'>#</th>
                                        {columns.map((p) => {
                                            const icon = iconOf(p.jugadorId);
                                            return (
                                                <th key={p.jugadorId} scope='col' title={p.nombreUsuario}>
                                                    {icon ? <img alt={p.nombreUsuario} src={buildProfileImageRoute(icon)}/> : p.nombreUsuario.slice(0, 2)}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {match.marcador.map((entry) => (
                                        <tr key={entry.numeroRonda}>
                                            <th scope='row' title={`Ganó ${nameOf(entry.ganadorId)} (${CLOSE_NAME[entry.tipoCierre] ?? entry.tipoCierre})`}>{entry.numeroRonda}</th>
                                            {columns.map((p) => {
                                                const score = entry.puntos.find((x) => x.jugadorId === p.jugadorId);
                                                const won = entry.ganadorId === p.jugadorId;
                                                return (
                                                    <td key={p.jugadorId} className={`${won ? 'is-winner' : ''} ${score?.eliminado ? 'is-out' : ''}`}>
                                                        {score ? <span className='num'>{score.puntosRonda > 0 ? `+${score.puntosRonda}` : score.puntosRonda}</span> : '—'}
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
