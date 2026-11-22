import {JSX, useEffect, useState} from 'react';
import './waiting-game.page.css';
import {BackendUtils} from '../../utils/backend.utils.tsx';
import {AlertTypeConstants} from '../../utils/constants/alert.constants.ts';
import {AlertComponent} from '../../components/alert/alert.component.tsx';
import {GetCurrentGameDetailResponse} from '../../types/services/get-current-game-detail.ts';
import {BackendConstants} from '../../utils/constants/backend.constants.ts';
import {GameType} from '../../types/game.type.ts';
import {PlayerWithUserType} from '../../types/player-with-user.type.ts';
import {WaitingPlayerListComponent} from './ui/waiting-player-list/waiting-player-list.component.tsx';
import {WaitingGameActionsComponent} from './ui/waiting-game-actions/waiting-game-actions.component.tsx';
import {WaitingGameInfoComponent} from './ui/waiting-game-info/waiting-game-info.component.tsx';
import {useWebSocket} from '../../config/websocket.provider.tsx';
import {SocketConstants} from '../../utils/constants/socket.constants.ts';
import {Navigate} from 'react-router-dom';
import {RoutesConstants} from '../../config/app.router.tsx';
import {GameConstants} from '../../utils/constants/game.constants.ts';

/**
 * Página para esperar un juego.
 * @constructor
 */
export function WaitingGamePage(): JSX.Element {

    /**
     * Hooks para el funcionamiento de la página.
     */
    const [game, setGame] = useState<GameType | undefined>();
    const [players, setPlayers] = useState<PlayerWithUserType[] | undefined>();

    const [redirect, setRedirect] = useState<boolean>(false);

    /**
     * Configuración del websocket y los listeners.
     */
    const {socket, connectWebSocket} = useWebSocket();
    useEffect(() => {
        if (!socket) {
            connectWebSocket();
            return;
        }

        socket.emit(SocketConstants.GAME_CONNECTION_EVENT);

        const handleJoinPlayer = (newPlayer: PlayerWithUserType) => {
            setPlayers((prev) => {
                const list = prev || [];
                if (list.some((p) => p.userId === newPlayer.userId)) {
                    return list.map((p) => (p.userId === newPlayer.userId ? newPlayer : p));
                }
                return [...list, newPlayer];
            });
        };

        const handleGameReady = (readyGame: GameType) => {
            setGame(readyGame);
        };

        const handleMatchStarted = () => {
            setRedirect(true);
        };

        socket.on(SocketConstants.JOIN_PLAYER_LISTENER, handleJoinPlayer);
        socket.on(SocketConstants.GAME_READY_TO_START_LISTENER, handleGameReady);
        socket.on(SocketConstants.MATCH_STARTED_LISTENER, handleMatchStarted);

        return () => {
            socket.off(SocketConstants.JOIN_PLAYER_LISTENER, handleJoinPlayer);
            socket.off(SocketConstants.GAME_READY_TO_START_LISTENER, handleGameReady);
            socket.off(SocketConstants.MATCH_STARTED_LISTENER, handleMatchStarted);
        };
    }, [socket]);

    /**
     * Hooks para la configuración del componente:
     * - La configuración para los componentes de alertas.
     */
    const [errorMessage, setErrorMessage] = useState<string>('');

    /**
     * Utils para acceder al backend.
     * @const {BackendUtils}
     */
    const backendUtils: BackendUtils = new BackendUtils(
        (message: string) => {
            setErrorMessage(message);
        }
    );

    /**
     * Hook que consume el backend para traer el juego actual del usuario
     * con polling cada 2s para sincronizar altas y bajas de jugadores en tiempo real.
     */
    useEffect(() => {
        let isMounted = true;

        async function fetchData(): Promise<void> {
            const res = await backendUtils.get<GetCurrentGameDetailResponse, never>(BackendConstants.GET_CURRENT_GAME_URL);
            if (!isMounted) return;
            if (res && res.game) {
                if (res.game.status === GameConstants.GAME_STATUS_ACTIVE) setRedirect(true);
                setGame(res.game);
                const uniquePlayers: PlayerWithUserType[] = [];
                const seenUserIds = new Set<string>();
                for (const p of res.players || []) {
                    if (p.isActive !== false && !seenUserIds.has(p.userId)) {
                        seenUserIds.add(p.userId);
                        uniquePlayers.push(p);
                    }
                }
                setPlayers(uniquePlayers);
            }
        }

        fetchData().then();
        const intervalId = setInterval(fetchData, 2000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    return (
        <>
            <div
                id='waiting-game-page-container'
                className='page-container'
            >
                <div id='waiting-game-page-container-title'>
                    <h1>Sala de espera</h1>
                </div>
                <WaitingGameInfoComponent game={game}/>
                <WaitingPlayerListComponent game={game} players={players}/>
                <WaitingGameActionsComponent game={game}/>
            </div>
            <AlertComponent
                type={AlertTypeConstants.ERROR_ALERT}
                rawMessage={errorMessage}
                setRawMessage={setErrorMessage}
            />
            {redirect ? <Navigate to={RoutesConstants.GAME}/> : <></>}

        </>
    );
}