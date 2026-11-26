import {JSX, useEffect, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {Button} from '@mui/material';
import {CreateGameComponent} from './ui/create-game/create-game.component.tsx';
import {OpenGamesComponent} from './ui/open-games/open-games.component.tsx';
import {useUser} from '../../config/user.context.tsx';
import {UserStatusConstants} from '../../utils/constants/user.constants.ts';
import {BackendUtils} from '../../utils/backend.utils.tsx';
import {BackendConstants} from '../../utils/constants/backend.constants.ts';
import {RoutesConstants} from '../../config/routes.constants.ts';
import {AlertComponent} from '../../components/alert/alert.component.tsx';
import {AlertTypeConstants} from '../../utils/constants/alert.constants.ts';
import {GetCurrentGameDetailResponse} from '../../types/services/get-current-game-detail.ts';
import {GameType} from '../../types/game.type.ts';
import {GameConstants} from '../../utils/constants/game.constants.ts';
import './home.page.css';

/**
 * Lobby shown after logging in: create a table or sit at an open one.
 */
export function HomePage(): JSX.Element {
    const {user, refreshUser} = useUser();
    const location = useLocation();
    const navigate = useNavigate();
    const [leaving, setLeaving] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [currentGame, setCurrentGame] = useState<GameType | undefined>();

    // An invitation link that failed comes back with the error code.
    useEffect(() => {
        const joinError: string | null = new URLSearchParams(location.search).get('joinError');
        if (joinError) {
            setErrorMessage(joinError === 'USER_IS_ALREADY_PLAYING_ERROR' ? joinError + '_JOINING' : joinError);
            navigate(RoutesConstants.HOME_ROUTE, {replace: true});
        }
    }, [location.search, navigate]);

    const isPlaying: boolean = user?.status === UserStatusConstants.PLAYING;

    // Loads the table in progress so the notice can name it and tell its state.
    useEffect(() => {
        if (!isPlaying) {
            setCurrentGame(undefined);
            return;
        }
        new BackendUtils().get<GetCurrentGameDetailResponse, never>(BackendConstants.GET_CURRENT_GAME_URL)
            .then((res) => setCurrentGame(res?.game));
    }, [isPlaying]);

    /** Leaves (or cancels, for the host) the table in progress and frees the account. */
    const leaveCurrentGame = async (): Promise<void> => {
        setLeaving(true);
        await new BackendUtils((message) => setErrorMessage(message)).delete(BackendConstants.GET_CURRENT_GAME_URL);
        await refreshUser();
        setLeaving(false);
    };

    const isHost: boolean = !!currentGame && currentGame.hostId === user?.userId;
    const isActive: boolean = currentGame?.status === GameConstants.GAME_STATUS_ACTIVE;
    const activeTitle: string = !currentGame
        ? 'Tienes una mesa en curso.'
        : isActive
            ? `Tu partida «${currentGame.name}» está en juego.`
            : `Tu mesa «${currentGame.name}» está esperando jugadores (${currentGame.currentPlayers} de ${currentGame.requiredPlayers}).`;
    const activeText: string = isActive
        ? 'Vuelve a la mesa para seguir jugando.'
        : isHost
            ? 'Vuelve a la sala para invitar jugadores, o cancélala para crear o unirte a otra.'
            : 'Vuelve a la sala, o sal de ella para crear o unirte a otra.';

    return (
        <div className='home-page page-width'>
            <header className='home-header'>
                <h1>{user ? `Hola, ${user.username}` : 'Hola'}</h1>
                <p className='muted'>Arma una mesa nueva o siéntate en una que esté esperando jugadores.</p>
            </header>

            {
                isPlaying
                    ? <div className='home-active-game' role='status'>
                        <div>
                            <strong>{activeTitle}</strong>
                            <p>{activeText}</p>
                        </div>
                        <div className='home-active-game-actions'>
                            <Button component={Link} to={isActive ? RoutesConstants.GAME : RoutesConstants.WAITING_GAME_ROUTE} variant='contained' color='secondary'>
                                {isActive ? 'Volver a la partida' : 'Volver a la sala'}
                            </Button>
                            {
                                isActive
                                    ? <></>
                                    : <Button variant='outlined' color='error' onClick={leaveCurrentGame} disabled={leaving}>{isHost ? 'Cancelar mesa' : 'Salir de la mesa'}</Button>
                            }
                        </div>
                    </div>
                    : <></>
            }

            <div className='home-grid'>
                <CreateGameComponent tokens={user?.tokens}/>
                <OpenGamesComponent/>
            </div>

            <AlertComponent
                type={AlertTypeConstants.ERROR_ALERT}
                rawMessage={errorMessage}
                setRawMessage={setErrorMessage}
            />
        </div>
    );
}
