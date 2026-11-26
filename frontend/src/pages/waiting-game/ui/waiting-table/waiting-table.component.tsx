import {CSSProperties, JSX} from 'react';
import {GameType} from '../../../../types/game.type.ts';
import {PlayerWithUserType} from '../../../../types/player-with-user.type.ts';
import {buildProfileImageRoute} from '../../../../utils/profile-image.utils.ts';
import {CardComponent} from '../../../../components/card/card.component.tsx';
import {CardSuitsConstants} from '../../../../utils/constants/card-suits.constants.ts';
import {CrownIconComponent} from '../../../../components/crown/crown.component.tsx';
import {TokenAmountComponent} from '../../../../components/token/token.component.tsx';
import {LocalLoadingComponent} from '../../../../components/loading/local/local-loading.component.tsx';
import './waiting-table.component.css';

/**
 * Seat position around the oval table. Seat 0 (the current user) sits at the bottom.
 * @param {number} index Seat index.
 * @param {number} total Total seats.
 */
function seatStyle(index: number, total: number): CSSProperties {
    const angle: number = Math.PI / 2 + (index * 2 * Math.PI) / total;
    return {
        '--x': `${50 + 47 * Math.cos(angle)}%`,
        '--y': `${50 + 44 * Math.sin(angle)}%`,
    } as CSSProperties;
}

/**
 * The waiting room table: one seat per required player, filled as players join.
 * @param props.game The table.
 * @param props.players Players already seated.
 * @param props.myId The current user's id.
 */
export function WaitingTableComponent(props: {
    game: GameType | undefined;
    players: PlayerWithUserType[] | undefined;
    myId: string | null;
}): JSX.Element {
    const {game, players} = props;
    if (!game || !players) {
        return <div className='waiting-table'><LocalLoadingComponent loading={true} showBackground={false} label='Preparando la mesa…'/></div>;
    }

    // The current user goes first so their seat is at the bottom, closest to them.
    const ordered: PlayerWithUserType[] = [...players].sort((a, b) => a.position - b.position);
    const mine: number = ordered.findIndex((p) => p.userId === props.myId);
    const rotated: PlayerWithUserType[] = mine > 0 ? [...ordered.slice(mine), ...ordered.slice(0, mine)] : ordered;
    const seats: Array<PlayerWithUserType | undefined> = Array.from({length: game.requiredPlayers}, (_, i) => rotated[i]);
    const missing: number = Math.max(0, game.requiredPlayers - players.length);

    return (
        <div className='waiting-table'>
            <div className='waiting-table-felt'>
                <div className='waiting-table-center'>
                    <span className='waiting-table-pot-label'>Pozo</span>
                    <TokenAmountComponent amount={game.betByPlayer * game.requiredPlayers} size='lg'/>
                    <span className='waiting-table-status'>
                        {missing === 0 ? '¡Mesa completa!' : `Falta${missing === 1 ? '' : 'n'} ${missing} jugador${missing === 1 ? '' : 'es'}`}
                    </span>
                </div>
            </div>
            <ul className='waiting-table-seats'>
                {seats.map((player, i) => (
                    <li key={player?.userId ?? `empty-${i}`} className={`waiting-seat ${player ? 'is-taken' : 'is-empty'}`} style={seatStyle(i, seats.length)}>
                        {
                            player
                                ? <>
                                    <span className='waiting-seat-avatar'>
                                        <img alt='' src={buildProfileImageRoute(player.icon)}/>
                                        <CardComponent
                                            designName={player.cardDesignName}
                                            suit={CardSuitsConstants.CLUB}
                                            type='A'
                                            positionClassName='waiting-seat-card'
                                            title={`Juega con el diseño de cartas ${player.cardDesignName}`}
                                        />
                                    </span>
                                    <span className='waiting-seat-name'>
                                        {game.hostId === player.userId ? <CrownIconComponent size={16}/> : <></>}
                                        <span>{player.username}</span>
                                    </span>
                                    {player.userId === props.myId ? <span className='waiting-seat-tag'>Tú</span> : <></>}
                                </>
                                : <>
                                    <span className='waiting-seat-avatar waiting-seat-free' aria-hidden='true'/>
                                    <span className='waiting-seat-name muted'>Puesto libre</span>
                                </>
                        }
                    </li>
                ))}
            </ul>
        </div>
    );
}
