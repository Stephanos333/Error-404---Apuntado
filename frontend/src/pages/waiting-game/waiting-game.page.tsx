import {JSX, useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {BackendUtils} from '../../utils/backend.utils.tsx';
import {AlertTypeConstants} from '../../utils/constants/alert.constants.ts';
import {AlertComponent} from '../../components/alert/alert.component.tsx';
import {GetCurrentGameDetailResponse} from '../../types/services/get-current-game-detail.ts';
import {BackendConstants} from '../../utils/constants/backend.constants.ts';
import {GameType} from '../../types/game.type.ts';
import {PlayerWithUserType} from '../../types/player-with-user.type.ts';
import {useWebSocket} from '../../config/websocket.provider.tsx';
import {SocketConstants} from '../../utils/constants/socket.constants.ts';
import {RoutesConstants} from '../../config/routes.constants.ts';
import {GameConstants} from '../../utils/constants/game.constants.ts';
import {LocaleStorageUtils} from '../../store/locale-storage.utils.ts';
import {LocaleStorageConstants} from '../../store/locale-storage.constants.ts';
import {GameTopBarComponent} from '../../components/game-top-bar/game-top-bar.component.tsx';
import {WaitingTableComponent} from './ui/waiting-table/waiting-table.component.tsx';
import {WaitingSidebarComponent} from './ui/waiting-sidebar/waiting-sidebar.component.tsx';
import './waiting-game.page.css';

/** Polling interval that keeps the room in sync if a socket event is lost. */
const POLL_MS: number = 2000;

/**
 * Keeps one entry per user, skipping inactive seats (a player who left and came back).
 * @param {PlayerWithUserType[]} players Players as returned by the backend.
 */
export function uniqueActivePlayers(players: PlayerWithUserType[]): PlayerWithUserType[] {
    const seen = new Set<string>();
    return players.filter((p) => {
        if (p.isActive === false || seen.has(p.userId)) return false;
        seen.add(p.userId);
        return true;
    });
}

/**
 * Waiting room: players take their seats until the table is full and the host starts.
 */
export function WaitingGamePage(): JSX.Element {
    const [game, setGame] = useState<GameType | undefined>();
    const [players, setPlayers] = useState<PlayerWithUserType[] | undefined>();
    const [redirect, setRedirect] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const myId: string | null = LocaleStorageUtils.get<LocaleStorageConstants.KEY_USER_ID>(LocaleStorageConstants.KEY_USER_ID);

    /** Socket listeners: players joining, table full and match started. */
    const {socket, connectWebSocket} = useWebSocket();
    useEffect(() => {
        if (!socket) {
            connectWebSocket();
            return;
        }

        socket.emit(SocketConstants.GAME_CONNECTION_EVENT);

        const handleJoinPlayer = (newPlayer: PlayerWithUserType) => {
            setPlayers((previous) => {
                const list = previous || [];
                if (list.some((p) => p.userId === newPlayer.userId)) {
                    return list.map((p) => (p.userId === newPlayer.userId ? newPlayer : p));
                }
                return [...list, newPlayer];
            });
        };
        const handleGameReady = (readyGame: GameType) => setGame(readyGame);
        const handleMatchStarted = () => setRedirect(true);

        socket.on(SocketConstants.JOIN_PLAYER_LISTENER, handleJoinPlayer);
        socket.on(SocketConstants.GAME_READY_TO_START_LISTENER, handleGameReady);
        socket.on(SocketConstants.MATCH_STARTED_LISTENER, handleMatchStarted);

        return () => {
            socket.off(SocketConstants.JOIN_PLAYER_LISTENER, handleJoinPlayer);
            socket.off(SocketConstants.GAME_READY_TO_START_LISTENER, handleGameReady);
            socket.off(SocketConstants.MATCH_STARTED_LISTENER, handleMatchStarted);
        };
    }, [socket]);

    /** Loads the current table and polls it so players leaving or joining always show up. */
    useEffect(() => {
        let isMounted = true;
        const backendUtils: BackendUtils = new BackendUtils((message: string) => setErrorMessage(message));

        async function fetchData(): Promise<void> {
            const res = await backendUtils.get<GetCurrentGameDetailResponse, never>(BackendConstants.GET_CURRENT_GAME_URL);
            if (!isMounted || !res || !res.game) return;
            if (res.game.status === GameConstants.GAME_STATUS_ACTIVE) setRedirect(true);
            setGame(res.game);
            setPlayers(uniqueActivePlayers(res.players || []));
        }

        fetchData().then();
        const intervalId = setInterval(fetchData, POLL_MS);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    return (
        <div className='waiting-page page-container'>
            <GameTopBarComponent title='Sala de espera'/>
            <main className='waiting-page-main page-width'>
                <header className='waiting-page-header'>
                    <h1>{game?.name ?? 'Tu mesa'}</h1>
                    <p className='muted'>
                        {game ? `${players?.length ?? 0} de ${game.requiredPlayers} jugadores sentados` : 'Cargando la mesa…'}
                    </p>
                </header>
                <div className='waiting-page-grid'>
                    <WaitingTableComponent game={game} players={players} myId={myId}/>
                    <WaitingSidebarComponent game={game} players={players} myId={myId}/>
                </div>
            </main>
            <AlertComponent
                type={AlertTypeConstants.ERROR_ALERT}
                rawMessage={errorMessage}
                setRawMessage={setErrorMessage}
            />
            {redirect ? <Navigate to={RoutesConstants.GAME}/> : <></>}
        </div>
    );
}
