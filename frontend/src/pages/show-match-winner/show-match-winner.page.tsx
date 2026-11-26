import {CSSProperties, JSX, useMemo} from 'react';
import {Link, Navigate, useLocation} from 'react-router-dom';
import {Button} from '@mui/material';
import {RoutesConstants} from '../../config/routes.constants.ts';
import {PublicMatchView} from '../../types/match.type.ts';
import {TokenAmountComponent} from '../../components/token/token.component.tsx';
import {CardComponent} from '../../components/card/card.component.tsx';
import {MODE_NAME} from '../game/game.page.tsx';
import './show-match-winner.page.css';

/** Readable close type, for the winner (second person) and for others (third person). */
const CLOSE_NAME: Record<string, { you: string; them: string }> = {
    GANAR_4_3_3: {you: 'cerraste con 4-3-3', them: 'cerró con 4-3-3'},
    TOCAR: {you: 'tocaste', them: 'tocó'},
};

/** Cards that rain down when the current user wins (decorative). */
const CONFETTI: ReadonlyArray<{ suit: string; type: string }> = [
    {suit: 'HEART', type: 'A'}, {suit: 'SPADE', type: 'K'}, {suit: 'DIAMOND', type: 'Q'}, {suit: 'CLUB', type: 'J'},
    {suit: 'HEART', type: 'C7'}, {suit: 'SPADE', type: 'A'}, {suit: 'DIAMOND', type: 'C3'}, {suit: 'CLUB', type: 'C10'},
];

/**
 * Final result of a match: the winner, the pot and the standings. It receives the final
 * public view from the table through the navigation state.
 */
export function ShowMatchWinnerPage(): JSX.Element {
    const state = useLocation().state as { match?: PublicMatchView; myId?: string | null } | null;
    const match: PublicMatchView | undefined = state?.match;

    const standings = useMemo(() => match
        ? [...match.jugadores].sort((a, b) =>
            (a.jugadorId === match.ganadorId ? -1 : 0) - (b.jugadorId === match.ganadorId ? -1 : 0)
            || (a.estado === 'ELIMINADO' ? 1 : 0) - (b.estado === 'ELIMINADO' ? 1 : 0)
            || a.puntaje - b.puntaje)
        : [], [match]);

    if (!match) return <Navigate to={RoutesConstants.HOME_ROUTE}/>;

    const winner = match.jugadores.find((j) => j.jugadorId === match.ganadorId);
    const iWon: boolean = !!state?.myId && state.myId === match.ganadorId;
    const lastRound = match.marcador[match.marcador.length - 1];
    const isApuntado: boolean = match.modalidad === 'apuntado';

    return (
        <div className='winner-page page-container'>
            {
                iWon
                    ? <div className='winner-confetti' aria-hidden='true'>
                        {CONFETTI.map((card, i) => (
                            <span key={i} style={{'--x': `${6 + i * 12}%`, '--delay': `${i * 140}ms`, '--spin': `${i % 2 ? 1 : -1}`} as CSSProperties}>
                                <CardComponent designName='DEFAULT' suit={card.suit} type={card.type}/>
                            </span>
                        ))}
                    </div>
                    : <></>
            }
            <main className='winner-main'>
                <p className='winner-kicker'>{MODE_NAME[match.modalidad] ?? match.modalidad}</p>
                <h1>{iWon ? '¡Ganaste!' : winner ? `Ganó ${winner.nombreUsuario}` : 'Partida terminada'}</h1>
                <p className='winner-lead muted'>
                    {winner && lastRound && lastRound.ganadorId === winner.jugadorId
                        ? `${iWon ? 'Ganaste' : winner.nombreUsuario + ' ganó'} la última ronda: ${CLOSE_NAME[lastRound.tipoCierre]?.[iWon ? 'you' : 'them'] ?? 'cerró'}.`
                        : `Se jugaron ${match.marcador.length} ${match.marcador.length === 1 ? 'ronda' : 'rondas'}.`}
                </p>

                <div className='winner-pot'>
                    <span>{iWon ? 'Te llevas' : 'Se lleva'}</span>
                    <TokenAmountComponent amount={match.pozo.total} size='lg'/>
                </div>

                <ol className='winner-standings'>
                    {standings.map((player, i) => {
                        const isWinner = player.jugadorId === match.ganadorId;
                        return (
                            <li key={player.jugadorId} className={`${isWinner ? 'is-winner' : ''} ${player.estado === 'ELIMINADO' ? 'is-eliminated' : ''}`}>
                                <span className='winner-place num'>{i + 1}</span>
                                <span className='winner-name'>
                                    {player.nombreUsuario}
                                    {player.jugadorId === state?.myId ? <small> (tú)</small> : <></>}
                                </span>
                                <span className='winner-state'>
                                    {isWinner ? 'Ganador' : player.estado === 'ELIMINADO' ? 'Eliminado' : ''}
                                </span>
                                {isApuntado ? <span className='winner-points num'>{player.puntaje} <small>pts</small></span> : <span/>}
                            </li>
                        );
                    })}
                </ol>

                <div className='winner-actions'>
                    <Button component={Link} to={RoutesConstants.HOME_ROUTE} variant='contained' size='large'>Jugar otra</Button>
                    <Button component={Link} to={RoutesConstants.DEFAULT_ROUTE} color='inherit' size='large'>Ir al inicio</Button>
                </div>
            </main>
        </div>
    );
}
