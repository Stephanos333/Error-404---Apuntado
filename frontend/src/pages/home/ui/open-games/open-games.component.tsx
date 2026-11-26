import {FormEvent, JSX, useCallback, useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {Button, IconButton, InputAdornment, TextField, Tooltip} from '@mui/material';
import {RefreshRounded, VpnKeyRounded} from '@mui/icons-material';
import {GameType} from '../../../../types/game.type.ts';
import {LocalLoadingComponent} from '../../../../components/loading/local/local-loading.component.tsx';
import {BackendUtils} from '../../../../utils/backend.utils.tsx';
import {BackendConstants} from '../../../../utils/constants/backend.constants.ts';
import {GetPublicGamesResponse} from '../../../../types/services/get-public-games.ts';
import {GlobalLoadingComponent} from '../../../../components/loading/global/global-loading.component.tsx';
import {AlertComponent} from '../../../../components/alert/alert.component.tsx';
import {AlertTypeConstants} from '../../../../utils/constants/alert.constants.ts';
import {RoutesConstants} from '../../../../config/routes.constants.ts';
import {JoinGameRequest, JoinGameResponse} from '../../../../types/services/join-game.ts';
import {TokenAmountComponent} from '../../../../components/token/token.component.tsx';
import {CardBackComponent} from '../../../../components/card/card.component.tsx';
import './open-games.component.css';

/** How often the open tables list refreshes on its own. */
const REFRESH_MS: number = 10000;

/** Short label of a mode. */
const MODE_FIGURE: Record<string, string> = {apuntado: '101', classic: '4-3-3'};

/**
 * Seats of a table as dots: taken seats filled.
 * @param props.taken Seats taken.
 * @param props.total Total seats.
 */
function SeatsComponent(props: { taken: number; total: number }): JSX.Element {
    return (
        <span className='open-games-seats' aria-label={`${props.taken} de ${props.total} puestos ocupados`}>
            {Array.from({length: props.total}, (_, i) => <span key={i} className={i < props.taken ? 'is-taken' : ''}/>)}
        </span>
    );
}

/**
 * Open (public) tables and joining by code.
 */
export function OpenGamesComponent(): JSX.Element {
    const [games, setGames] = useState<Array<GameType> | undefined>(undefined);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const [loading, setLoading] = useState<boolean>(false);
    const [redirect, setRedirect] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const loadGames = useCallback(async (): Promise<void> => {
        setRefreshing(true);
        const res = await new BackendUtils().get<GetPublicGamesResponse, never>(BackendConstants.GET_PUBLIC_GAMES_URL);
        if (res) setGames(res.data);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadGames().then();
        const interval = setInterval(() => loadGames().then(), REFRESH_MS);
        return () => clearInterval(interval);
    }, [loadGames]);

    /**
     * Joins a table and opens the waiting room.
     * @param {string} gameId The table id.
     */
    const joinGame = async (gameId: string): Promise<void> => {
        setLoading(true);
        const backendUtils: BackendUtils = new BackendUtils((message: string) => {
            setLoading(false);
            setErrorMessage(message === 'USER_IS_ALREADY_PLAYING_ERROR' ? message + '_JOINING' : message);
        });
        const res = await backendUtils.patch<JoinGameResponse, JoinGameRequest>(BackendConstants.JOIN_GAME_URL, {gameId});
        if (res) {
            setLoading(false);
            setRedirect(true);
        }
    };

    const joinByCode = (event: FormEvent): void => {
        event.preventDefault();
        // Accepts the bare code or a full invitation link.
        const match = code.trim().match(/gameId=([^&\s]+)/);
        const gameId: string = match ? match[1] : code.trim();
        if (gameId) joinGame(gameId).then();
    };

    return (
        <>
            <section className='open-games felt-panel' aria-labelledby='open-games-title'>
                <header className='open-games-header'>
                    <div>
                        <h2 id='open-games-title'>Mesas abiertas</h2>
                        <p className='muted'>{!games ? 'Buscando mesas…' : games.length === 0 ? 'Ninguna mesa esperando jugadores' : `${games.length} ${games.length === 1 ? 'mesa esperando' : 'mesas esperando'} jugadores`}</p>
                    </div>
                    <Tooltip title='Actualizar' arrow>
                        <IconButton aria-label='Actualizar la lista' onClick={() => loadGames()} className={refreshing ? 'is-spinning' : ''}>
                            <RefreshRounded/>
                        </IconButton>
                    </Tooltip>
                </header>

                {
                    !games
                        ? <LocalLoadingComponent loading={true} showBackground={false} label='Buscando mesas…'/>
                        : games.length === 0
                            ? <div className='open-games-empty'>
                                <div className='open-games-empty-deck' aria-hidden='true'>
                                    <CardBackComponent/>
                                    <CardBackComponent/>
                                </div>
                                <p><strong>No hay mesas abiertas ahora.</strong></p>
                                <p className='muted'>Crea una pública o invita a tus amigos con el enlace de tu sala.</p>
                            </div>
                            : <ul className='open-games-list'>
                                {games.map((game) => {
                                    const full: boolean = game.currentPlayers >= game.requiredPlayers;
                                    return (
                                        <li key={game.gameId} className='open-games-item'>
                                            {
                                                game.ruleId
                                                    ? <span className='open-games-mode num' title={game.ruleId === 'classic' ? 'Clásica 4-3-3' : 'Apuntado a 101'}>{MODE_FIGURE[game.ruleId] ?? game.ruleId}</span>
                                                    : <></>
                                            }
                                            <div className='open-games-info'>
                                                <span className='open-games-name'>{game.name}</span>
                                                <span className='open-games-meta'>
                                                    <SeatsComponent taken={game.currentPlayers} total={game.requiredPlayers}/>
                                                    <span className='muted'>{game.currentPlayers} de {game.requiredPlayers}</span>
                                                </span>
                                            </div>
                                            <span className='open-games-bet' title='Apuesta por jugador'>
                                                <TokenAmountComponent amount={game.betByPlayer} size='sm'/>
                                            </span>
                                            <Button variant='contained' size='small' onClick={() => joinGame(game.gameId)} disabled={full}>
                                                {full ? 'Llena' : 'Sentarme'}
                                            </Button>
                                        </li>
                                    );
                                })}
                            </ul>
                }

                <form className='open-games-code' onSubmit={joinByCode}>
                    <TextField
                        size='small'
                        id='open-games-code'
                        label='¿Tienes un código o enlace?'
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        InputProps={{startAdornment: <InputAdornment position='start'><VpnKeyRounded fontSize='small'/></InputAdornment>}}
                    />
                    <Button type='submit' variant='outlined' color='inherit' disabled={!code.trim()}>Unirme</Button>
                </form>
            </section>
            <GlobalLoadingComponent loading={loading}/>
            <AlertComponent
                type={AlertTypeConstants.ERROR_ALERT}
                rawMessage={errorMessage}
                setRawMessage={setErrorMessage}
            />
            {redirect ? <Navigate to={RoutesConstants.WAITING_GAME_ROUTE}/> : <></>}
        </>
    );
}
