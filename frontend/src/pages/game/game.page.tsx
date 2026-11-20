import './game.page.css';
import {JSX, useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useWebSocket} from '../../config/websocket.provider.tsx';
import {RoutesConstants} from '../../config/app.router.tsx';
import {GetCurrentGameDetailResponse} from '../../types/services/get-current-game-detail.ts';
import {GetCurrentCardDesign} from '../../types/services/get-current-card-design.ts';
import {BackendConstants} from '../../utils/constants/backend.constants.ts';
import {BackendUtils} from '../../utils/backend.utils.tsx';
import {GameType} from '../../types/game.type.ts';
import {PlayerWithUserType} from '../../types/player-with-user.type.ts';
import {MensajePublicoPartida} from '../../types/partida.type.ts';
import {LocaleStorageUtils} from '../../store/locale-storage.utils.ts';
import {LocaleStorageConstants} from '../../store/locale-storage.constants.ts';
import {AlertComponent} from '../../components/alert/alert.component.tsx';
import {AlertTypeConstants} from '../../utils/constants/alert.constants.ts';
import {GamePlayersListComponent} from './ui/game-players-list/game-players-list.component.tsx';
import {GameBoardComponent} from './ui/game-board/game-board.component.tsx';
import {usePartida} from './use-partida.ts';

/**
 * Página para jugar una partida (agregado `partidas`).
 * El estado llega por `GET /api/partidas/actual` y por las salas pública y privada del socket.
 * @constructor
 */
export function GamePage(): JSX.Element {

    const navigate = useNavigate();
    const miId: string | null = LocaleStorageUtils.get<LocaleStorageConstants.KEY_USER_ID>(LocaleStorageConstants.KEY_USER_ID);

    /**
     * Alertas de la página (errores de comandos y avisos de la partida).
     */
    const [alertType, setAlertType] = useState<AlertTypeConstants>(AlertTypeConstants.ERROR_ALERT);
    const [alertMessage, setAlertMessage] = useState<string>('');
    const mostrarAlerta = useCallback((tipo: AlertTypeConstants, codigo: string): void => {
        setAlertType(tipo);
        setAlertMessage(codigo);
    }, []);

    /**
     * Avisos de los eventos públicos de la partida.
     */
    const alMensaje = useCallback((mensaje: MensajePublicoPartida): void => {
        switch (mensaje.evento) {
        case 'CIERRE_FALLIDO':
            if (mensaje.jugadorId === miId) mostrarAlerta(AlertTypeConstants.WARNING_ALERT, 'CIERRE_FALLIDO_MESSAGE');
            break;
        case 'JUGADOR_TOCO':
            mostrarAlerta(AlertTypeConstants.WARNING_ALERT, mensaje.jugadorId === miId ? 'TOCASTE_MESSAGE' : 'JUGADOR_TOCO_MESSAGE');
            break;
        case 'RONDA_INICIADA':
            mostrarAlerta(AlertTypeConstants.SUCCESS_ALERT, 'RONDA_INICIADA_MESSAGE');
            break;
        case 'PARTIDA_FINALIZADA':
            navigate(RoutesConstants.SHOW_MATCH_WINNER, {state: {partida: mensaje.partida}});
            break;
        default:
            break;
        }
    }, [miId, mostrarAlerta, navigate]);

    /**
     * Configuración de los websockets y del estado en vivo de la partida.
     */
    const {socket, connectWebSocket} = useWebSocket();
    useEffect(() => {
        if (!socket) connectWebSocket();
    }, [socket]);
    const {partida, mano, cliente, aplicarResultado} = usePartida(socket, alMensaje);

    /**
     * Datos de la sala (anfitrión e íconos) y diseño de cartas del usuario.
     */
    const [game, setGame] = useState<GameType | undefined>();
    const [players, setPlayers] = useState<PlayerWithUserType[] | undefined>();
    const [diseno, setDiseno] = useState<string>('DEFAULT');
    useEffect(() => {
        async function fetchData(): Promise<void> {
            const backendUtils: BackendUtils = new BackendUtils();
            const [detalle, disenoActual] = await Promise.all([
                backendUtils.get<GetCurrentGameDetailResponse, never>(BackendConstants.GET_CURRENT_GAME_URL),
                backendUtils.get<GetCurrentCardDesign, never>(BackendConstants.GET_CURRENT_CARD_DESIGN_URL),
            ]);
            if (detalle) {
                setGame(detalle.game);
                setPlayers(detalle.players);
            }
            if (disenoActual) setDiseno(disenoActual.design.name);
        }

        fetchData().then();
    }, []);

    /**
     * Si la partida ya terminó al cargar (p. ej. tras recargar la página), se muestra el resultado.
     */
    useEffect(() => {
        if (partida?.estado === 'FINALIZADA') navigate(RoutesConstants.SHOW_MATCH_WINNER, {state: {partida}});
    }, [partida, navigate]);

    return (
        <>
            <div className='page-container' id='game-page-container'>
                <GamePlayersListComponent partida={partida} players={players} game={game}/>
                <GameBoardComponent
                    partida={partida}
                    mano={mano}
                    miId={miId}
                    diseno={diseno}
                    cliente={cliente}
                    aplicarResultado={aplicarResultado}
                    mostrarAlerta={mostrarAlerta}
                />
            </div>
            <AlertComponent
                type={alertType}
                rawMessage={alertMessage}
                setRawMessage={setAlertMessage}
            />
        </>
    );
}
