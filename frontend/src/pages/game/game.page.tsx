import './game.page.css';
import {JSX, useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button, Drawer, IconButton, Tooltip} from '@mui/material';
import {CloseRounded, LeaderboardRounded} from '@mui/icons-material';
import {useWebSocket} from '../../config/websocket.provider.tsx';
import {RoutesConstants} from '../../config/routes.constants.ts';
import {GetCurrentGameDetailResponse} from '../../types/services/get-current-game-detail.ts';
import {GetCurrentCardDesign} from '../../types/services/get-current-card-design.ts';
import {BackendConstants} from '../../utils/constants/backend.constants.ts';
import {BackendUtils} from '../../utils/backend.utils.tsx';
import {GameType} from '../../types/game.type.ts';
import {PlayerWithUserType} from '../../types/player-with-user.type.ts';
import {PublicMatchMessage} from '../../types/match.type.ts';
import {LocaleStorageUtils} from '../../store/locale-storage.utils.ts';
import {LocaleStorageConstants} from '../../store/locale-storage.constants.ts';
import {AlertComponent} from '../../components/alert/alert.component.tsx';
import {AlertTypeConstants} from '../../utils/constants/alert.constants.ts';
import {GameTopBarComponent} from '../../components/game-top-bar/game-top-bar.component.tsx';
import {TokenAmountComponent} from '../../components/token/token.component.tsx';
import {OpponentsComponent} from './ui/opponents/opponents.component.tsx';
import {GameBoardComponent} from './ui/game-board/game-board.component.tsx';
import {ScoreboardComponent} from './ui/scoreboard/scoreboard.component.tsx';
import {useMatch} from './use-match.ts';

/** Readable mode name. */
export const MODE_NAME: Record<string, string> = {apuntado: 'Apuntado a 101', classic: 'Clásica 4-3-3'};

/**
 * Match page (the `matches` aggregate). State comes from `GET /api/matches/current` and from
 * the public and private socket rooms.
 */
export function GamePage(): JSX.Element {

    const navigate = useNavigate();
    const myId: string | null = LocaleStorageUtils.get<LocaleStorageConstants.KEY_USER_ID>(LocaleStorageConstants.KEY_USER_ID);
    const [scoreboardOpen, setScoreboardOpen] = useState<boolean>(false);

    /** Page alerts (command errors and match notices). */
    const [alertType, setAlertType] = useState<AlertTypeConstants>(AlertTypeConstants.ERROR_ALERT);
    const [alertMessage, setAlertMessage] = useState<string>('');
    const showAlert = useCallback((type: AlertTypeConstants, code: string): void => {
        setAlertType(type);
        setAlertMessage(code);
    }, []);

    /** Notices for the public match events. */
    const handleMessage = useCallback((message: PublicMatchMessage): void => {
        switch (message.event) {
        case 'CLOSE_FAILED':
            if (message.playerId === myId) showAlert(AlertTypeConstants.WARNING_ALERT, 'CLOSE_FAILED_MESSAGE');
            break;
        case 'PLAYER_KNOCKED':
            showAlert(AlertTypeConstants.WARNING_ALERT, message.playerId === myId ? 'YOU_KNOCKED_MESSAGE' : 'PLAYER_KNOCKED_MESSAGE');
            break;
        case 'ROUND_STARTED':
            showAlert(AlertTypeConstants.SUCCESS_ALERT, 'ROUND_STARTED_MESSAGE');
            break;
        case 'MATCH_FINISHED':
            navigate(RoutesConstants.SHOW_MATCH_WINNER, {state: {match: message.match, myId}});
            break;
        default:
            break;
        }
    }, [myId, showAlert, navigate]);

    /** Sockets and live match state. */
    const {socket, connectWebSocket} = useWebSocket();
    useEffect(() => {
        if (!socket) connectWebSocket();
    }, [socket]);
    const {match, hand, client, applyResult} = useMatch(socket, handleMessage);

    /** Table data (host and icons) and the user's card design. */
    const [game, setGame] = useState<GameType | undefined>();
    const [players, setPlayers] = useState<PlayerWithUserType[] | undefined>();
    const [design, setDesign] = useState<string>('DEFAULT');
    useEffect(() => {
        async function fetchData(): Promise<void> {
            const backendUtils: BackendUtils = new BackendUtils();
            const [detail, currentDesign] = await Promise.all([
                backendUtils.get<GetCurrentGameDetailResponse, never>(BackendConstants.GET_CURRENT_GAME_URL),
                backendUtils.get<GetCurrentCardDesign, never>(BackendConstants.GET_CURRENT_CARD_DESIGN_URL),
            ]);
            if (detail) {
                setGame(detail.game);
                setPlayers(detail.players);
            }
            if (currentDesign) setDesign(currentDesign.design.name);
        }

        fetchData().then();
    }, []);

    /** If the match had already finished when loading (e.g. after a reload), show the result. */
    useEffect(() => {
        if (match?.status === 'FINISHED') navigate(RoutesConstants.SHOW_MATCH_WINNER, {state: {match, myId}});
    }, [match, navigate, myId]);

    /** The tab title tells you it is your turn when you are looking at another tab. */
    const myTurn: boolean = !!match?.round && match.round.turn.playerId === myId && match.status === 'IN_PROGRESS';
    useEffect(() => {
        document.title = myTurn ? '¡Tu turno! · Apuntado' : 'Apuntado';
        return () => {
            document.title = 'Apuntado';
        };
    }, [myTurn]);

    const modeName: string = match ? MODE_NAME[match.mode] ?? match.mode : '';

    return (
        <div className='game-page page-container'>
            <GameTopBarComponent title={game?.name ?? 'Partida'}>
                {
                    match
                        ? <div className='game-page-facts'>
                            <span className='game-page-fact'>{modeName}</span>
                            {match.round ? <span className='game-page-fact'>Ronda <strong className='num'>{match.round.number}</strong></span> : <></>}
                            <Tooltip title='Pozo de la partida' arrow>
                                <span className='game-page-fact game-page-pot'><TokenAmountComponent amount={match.pot.total} size='sm' label='fichas en el pozo'/></span>
                            </Tooltip>
                        </div>
                        : <></>
                }
                <Button
                    className='game-page-scoreboard-toggle'
                    color='inherit'
                    startIcon={<LeaderboardRounded/>}
                    onClick={() => setScoreboardOpen(true)}
                >Marcador</Button>
            </GameTopBarComponent>

            <div className='game-page-body'>
                <main className='game-page-table'>
                    <OpponentsComponent match={match} players={players} game={game} myId={myId}/>
                    <GameBoardComponent
                        match={match}
                        hand={hand}
                        myId={myId}
                        design={design}
                        client={client}
                        applyResult={applyResult}
                        showAlert={showAlert}
                    />
                </main>
                <aside className='game-page-side' aria-label='Marcador'>
                    <ScoreboardComponent match={match} players={players} myId={myId}/>
                </aside>
            </div>

            <Drawer
                anchor='right'
                open={scoreboardOpen}
                onClose={() => setScoreboardOpen(false)}
                PaperProps={{className: 'game-page-drawer'}}
            >
                <div className='game-page-drawer-header'>
                    <h2>Marcador</h2>
                    <IconButton aria-label='Cerrar marcador' onClick={() => setScoreboardOpen(false)}><CloseRounded/></IconButton>
                </div>
                <ScoreboardComponent match={match} players={players} myId={myId}/>
            </Drawer>

            <AlertComponent
                type={alertType}
                rawMessage={alertMessage}
                setRawMessage={setAlertMessage}
            />
        </div>
    );
}
