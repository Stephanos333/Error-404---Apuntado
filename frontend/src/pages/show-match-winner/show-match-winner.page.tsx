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
    WIN_4_3_3: {you: 'cerraste con 4-3-3', them: 'cerró con 4-3-3'},
    KNOCK: {you: 'tocaste', them: 'tocó'},
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
        ? [...match.players].sort((a, b) =>
            (a.playerId === match.winnerId ? -1 : 0) - (b.playerId === match.winnerId ? -1 : 0)
            || (a.status === 'ELIMINATED' ? 1 : 0) - (b.status === 'ELIMINATED' ? 1 : 0)
            || a.score - b.score)
        : [], [match]);

    if (!match) return <Navigate to={RoutesConstants.HOME_ROUTE}/>;

    const winner = match.players.find((j) => j.playerId === match.winnerId);
    const iWon: boolean = !!state?.myId && state.myId === match.winnerId;
    const lastRound = match.scoreboard[match.scoreboard.length - 1];
    const isApuntado: boolean = match.mode === 'apuntado';

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
                <p className='winner-kicker'>{MODE_NAME[match.mode] ?? match.mode}</p>
                <h1>{iWon ? '¡Ganaste!' : winner ? `Ganó ${winner.username}` : 'Partida terminada'}</h1>
                <p className='winner-lead muted'>
                    {winner && lastRound && lastRound.winnerId === winner.playerId
                        ? `${iWon ? 'Ganaste' : winner.username + ' ganó'} la última ronda: ${CLOSE_NAME[lastRound.closeType]?.[iWon ? 'you' : 'them'] ?? 'cerró'}.`
                        : `Se jugaron ${match.scoreboard.length} ${match.scoreboard.length === 1 ? 'ronda' : 'rondas'}.`}
                </p>

                <div className='winner-pot'>
                    <span>{iWon ? 'Te llevas' : 'Se lleva'}</span>
                    <TokenAmountComponent amount={match.pot.total} size='lg'/>
                </div>

                <ol className='winner-standings'>
                    {standings.map((player, i) => {
                        const isWinner = player.playerId === match.winnerId;
                        return (
                            <li key={player.playerId} className={`${isWinner ? 'is-winner' : ''} ${player.status === 'ELIMINATED' ? 'is-eliminated' : ''}`}>
                                <span className='winner-place num'>{i + 1}</span>
                                <span className='winner-name'>
                                    {player.username}
                                    {player.playerId === state?.myId ? <small> (tú)</small> : <></>}
                                </span>
                                <span className='winner-state'>
                                    {isWinner ? 'Ganador' : player.status === 'ELIMINATED' ? 'Eliminado' : ''}
                                </span>
                                {isApuntado ? <span className='winner-points num'>{player.score} <small>pts</small></span> : <span/>}
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
