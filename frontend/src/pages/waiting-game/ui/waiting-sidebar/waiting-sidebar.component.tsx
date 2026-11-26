import {JSX, useState} from 'react';
import {Button, Dialog, DialogActions, DialogContent, IconButton, ThemeProvider, Tooltip} from '@mui/material';
import {CheckRounded, ContentCopyRounded, IosShareRounded, PlayArrowRounded} from '@mui/icons-material';
import {GameType} from '../../../../types/game.type.ts';
import {PlayerWithUserType} from '../../../../types/player-with-user.type.ts';
import {GameConstants} from '../../../../utils/constants/game.constants.ts';
import {AlertTypeConstants} from '../../../../utils/constants/alert.constants.ts';
import {AlertComponent} from '../../../../components/alert/alert.component.tsx';
import {RoutesConstants} from '../../../../config/routes.constants.ts';
import {BackendUtils} from '../../../../utils/backend.utils.tsx';
import {StartMatchResponse} from '../../../../types/services/start-match.ts';
import {BackendConstants} from '../../../../utils/constants/backend.constants.ts';
import {GlobalLoadingComponent} from '../../../../components/loading/global/global-loading.component.tsx';
import {PaperTheme} from '../../../../config/app.theme.tsx';
import './waiting-sidebar.component.css';

/** Readable mode name. */
const MODE_NAME: Record<string, string> = {apuntado: 'Apuntado a 101', clasica: 'Clásica 4-3-3'};

/**
 * Waiting room side panel: table details, invitation and the host/guest actions.
 * @param props.game The table.
 * @param props.players Seated players.
 * @param props.myId The current user's id.
 */
export function WaitingSidebarComponent(props: {
    game: GameType | undefined;
    players: PlayerWithUserType[] | undefined;
    myId: string | null;
}): JSX.Element {
    const {game} = props;
    const [alertType, setAlertType] = useState<AlertTypeConstants>(AlertTypeConstants.SUCCESS_ALERT);
    const [alertMessage, setAlertMessage] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [copied, setCopied] = useState<'link' | 'code' | null>(null);
    const [confirmLeave, setConfirmLeave] = useState<boolean>(false);

    const isHost: boolean = !!game && !!props.myId && props.myId === game.hostId;
    const isFull: boolean = game?.status === GameConstants.GAME_STATUS_WAITING_TO_START;
    const joinUrl: string = game ? `${window.location.origin}/#${RoutesConstants.JOIN_GAME}?gameId=${game.gameId}` : '';
    const hostName: string = props.players?.find((p) => p.userId === game?.hostId)?.username ?? 'el anfitrión';

    const showError = (message: string): void => {
        setLoading(false);
        setAlertType(AlertTypeConstants.ERROR_ALERT);
        setAlertMessage(message);
    };

    /**
     * Copies a text and briefly marks the button as copied.
     * @param {string} text What to copy.
     * @param {'link' | 'code'} what Which button was used.
     */
    const copy = (text: string, what: 'link' | 'code'): void => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopied(what);
                setAlertType(AlertTypeConstants.SUCCESS_ALERT);
                setAlertMessage('COPY_ON_CLIP_BOARD_MESSAGE');
                setTimeout(() => setCopied(null), 2000);
            })
            .catch(() => showError('SOMETHING_WENT_WRONG_ERROR'));
    };

    /** Opens the system share sheet (phones), falling back to copying the link. */
    const share = (): void => {
        if (!game) return;
        if (navigator.share) {
            navigator.share({title: 'Apuntado', text: `Siéntate en mi mesa "${game.name}"`, url: joinUrl}).catch(() => undefined);
        } else {
            copy(joinUrl, 'link');
        }
    };

    /** Starts the match (host only). The page moves to the table when the socket confirms it. */
    const startMatch = async (): Promise<void> => {
        setLoading(true);
        await new BackendUtils(showError).post<StartMatchResponse, never>(BackendConstants.START_MATCH_URL);
        setLoading(false);
    };

    /** Leaves the table; for the host this cancels it for everyone. */
    const leaveGame = async (): Promise<void> => {
        setConfirmLeave(false);
        setLoading(true);
        await new BackendUtils(showError).delete(BackendConstants.GET_CURRENT_GAME_URL);
        setLoading(false);
        window.location.hash = RoutesConstants.HOME_ROUTE;
    };

    return (
        <>
            <aside className='waiting-sidebar'>
                <section className='waiting-sidebar-block'>
                    <dl className='waiting-sidebar-facts'>
                        <div><dt>Modalidad</dt><dd>{game ? MODE_NAME[game.ruleId ?? ''] ?? 'Apuntado a 101' : '—'}</dd></div>
                        <div><dt>Apuesta</dt><dd>{game ? `${game.betByPlayer} ${game.betByPlayer === 1 ? 'ficha' : 'fichas'} por jugador` : '—'}</dd></div>
                        <div><dt>Mesa</dt><dd>{game ? (game.isPublic ? 'Pública' : 'Privada') : '—'}</dd></div>
                    </dl>
                </section>

                <section className='waiting-sidebar-block' aria-labelledby='waiting-invite-title'>
                    <h2 id='waiting-invite-title'>Invita a tus amigos</h2>
                    {
                        isFull
                            ? <p className='muted'>La mesa ya está completa.</p>
                            : <>
                                <p className='muted'>Comparte el enlace; quien lo abra se sienta en un puesto libre.</p>
                                <div className='waiting-sidebar-link'>
                                    <span title={joinUrl}>{joinUrl.replace(/^https?:\/\//, '')}</span>
                                    <Tooltip title={copied === 'link' ? 'Copiado' : 'Copiar enlace'} arrow>
                                        <span>
                                            <IconButton aria-label='Copiar enlace' onClick={() => copy(joinUrl, 'link')} disabled={!game}>
                                                {copied === 'link' ? <CheckRounded/> : <ContentCopyRounded/>}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </div>
                                <div className='waiting-sidebar-share'>
                                    <Button variant='outlined' color='inherit' startIcon={<IosShareRounded/>} onClick={share} disabled={!game}>Compartir</Button>
                                    <Button color='inherit' onClick={() => game && copy(game.gameId, 'code')} disabled={!game}>
                                        {copied === 'code' ? 'Código copiado' : 'Copiar código'}
                                    </Button>
                                </div>
                            </>
                    }
                </section>

                <section className='waiting-sidebar-block waiting-sidebar-actions'>
                    {
                        isHost
                            ? <>
                                <Button
                                    variant='contained'
                                    size='large'
                                    fullWidth
                                    startIcon={<PlayArrowRounded/>}
                                    onClick={startMatch}
                                    disabled={!isFull || loading}
                                >Iniciar partida</Button>
                                <p className='waiting-sidebar-hint muted'>
                                    {isFull ? 'Todos están sentados. Cuando quieras.' : 'Se activa cuando todos los puestos estén ocupados.'}
                                </p>
                            </>
                            : <p className='waiting-sidebar-hint'>
                                {isFull ? `Mesa completa. Esperando a que ${hostName} inicie la partida…` : 'Esperando a que se llenen los puestos…'}
                            </p>
                    }
                    <Button color='error' onClick={() => isHost ? setConfirmLeave(true) : leaveGame()} disabled={loading || !game}>
                        {isHost ? 'Cancelar mesa' : 'Salir de la mesa'}
                    </Button>
                </section>
            </aside>

            <ThemeProvider theme={PaperTheme}>
                <Dialog open={confirmLeave} onClose={() => setConfirmLeave(false)} maxWidth='xs' fullWidth>
                    <DialogContent>
                        <h2 className='waiting-sidebar-dialog-title'>¿Cancelar la mesa?</h2>
                        <p>Todos los jugadores saldrán de la sala y la mesa desaparecerá.</p>
                    </DialogContent>
                    <DialogActions sx={{padding: '0 24px 20px'}}>
                        <Button onClick={() => setConfirmLeave(false)}>Seguir esperando</Button>
                        <Button variant='contained' color='error' onClick={leaveGame}>Cancelar mesa</Button>
                    </DialogActions>
                </Dialog>
            </ThemeProvider>

            <AlertComponent type={alertType} rawMessage={alertMessage} setRawMessage={setAlertMessage}/>
            <GlobalLoadingComponent loading={loading}/>
        </>
    );
}
