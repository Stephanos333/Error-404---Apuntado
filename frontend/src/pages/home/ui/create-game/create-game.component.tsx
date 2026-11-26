import {FormEvent, JSX, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {Button, IconButton, TextField, ThemeProvider} from '@mui/material';
import {AddRounded, RemoveRounded} from '@mui/icons-material';
import {PaperTheme} from '../../../../config/app.theme.tsx';
import {SegmentedComponent} from '../../../../components/segmented/segmented.component.tsx';
import {TokenAmountComponent, TokenIconComponent} from '../../../../components/token/token.component.tsx';
import {ValidationUtils} from '../../../../utils/validation.utils.ts';
import {GlobalLoadingComponent} from '../../../../components/loading/global/global-loading.component.tsx';
import {CreateGameRequest, CreateGameResponse} from '../../../../types/services/create-game.ts';
import {BackendUtils} from '../../../../utils/backend.utils.tsx';
import {AlertTypeConstants} from '../../../../utils/constants/alert.constants.ts';
import {AlertComponent} from '../../../../components/alert/alert.component.tsx';
import {BackendConstants} from '../../../../utils/constants/backend.constants.ts';
import {RoutesConstants} from '../../../../config/routes.constants.ts';
import './create-game.component.css';

/** Game modes offered when creating a table. */
const MODES = [
    {ruleId: 'apuntado', figure: '101', title: 'Apuntado a 101', text: 'Varias rondas, eliminación a los 101 puntos.'},
    {ruleId: 'clasica', figure: '4-3-3', title: 'Clásica', text: 'Una ronda: gana el primero en cerrar.'},
];

/**
 * Form to create a table: name, mode, seats, bet and visibility, with the resulting pot.
 * @param props.tokens The user's tokens (to warn when the bet is too high).
 */
export function CreateGameComponent(props: { tokens: number | undefined }): JSX.Element {

    const [players, setPlayers] = useState<number>(4);
    const [isPublic, setIsPublic] = useState<boolean>(false);
    const [ruleId, setRuleId] = useState<string>('apuntado');

    const [gameName, setGameName] = useState<string>('');
    const [gameNameError, setGameNameError] = useState<string>('');

    const [betByPlayer, setBetByPlayer] = useState<number | string>(5);
    const [betByPlayerError, setBetByPlayerError] = useState<string>('');

    const [loading, setLoading] = useState<boolean>(false);
    const [redirect, setRedirect] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const backendUtils: BackendUtils = new BackendUtils(
        (message: string) => {
            setLoading(false);
            setErrorMessage(message);
        }
    );

    const handleChangeGameName = (value: string): void => {
        setGameName(value);
        ValidationUtils.validateGameName(value, setGameNameError);
    };

    const handleChangeBetByPlayer = (value: string): void => {
        const parsed: string | number = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
        setBetByPlayer(parsed);
        ValidationUtils.validateBetByPlayer(parsed, setBetByPlayerError);
    };

    const stepBet = (delta: number): void => {
        const current: number = typeof betByPlayer === 'number' ? betByPlayer : 0;
        handleChangeBetByPlayer(String(Math.max(1, current + delta)));
    };

    /**
     * Creates the table and opens the waiting room.
     * @returns {Promise<void | false>} `false` when the form is invalid.
     */
    const createGame = async (event?: FormEvent): Promise<void | false> => {
        event?.preventDefault();
        if (!ValidationUtils.validateGameName(gameName, setGameNameError)) return false;
        if (!ValidationUtils.validateBetByPlayer(betByPlayer, setBetByPlayerError)) return false;
        setLoading(true);
        const body: CreateGameRequest = {
            name: gameName.trim(),
            isPublic,
            requiredPlayers: players,
            betByPlayer: betByPlayer as number,
            ruleId,
        };
        const res = await backendUtils.post<CreateGameResponse, CreateGameRequest>(BackendConstants.CREATE_GAME_URL, body);
        if (res) {
            setLoading(false);
            setRedirect(true);
        }
    };

    const bet: number = typeof betByPlayer === 'number' ? betByPlayer : 0;
    const notEnoughTokens: boolean = props.tokens !== undefined && bet > props.tokens;

    return (
        <ThemeProvider theme={PaperTheme}>
            <section className='create-game paper' aria-labelledby='create-game-title'>
                <h2 id='create-game-title'>Nueva mesa</h2>
                <form className='create-game-form' autoComplete='off' onSubmit={createGame} noValidate>
                    <TextField
                        required
                        id='create-game-name'
                        label='Nombre de la mesa'
                        placeholder='Mesa de los viernes'
                        value={gameName}
                        error={!!gameNameError}
                        helperText={gameNameError || ' '}
                        onChange={(e) => handleChangeGameName(e.target.value)}
                    />

                    <fieldset className='create-game-modes'>
                        <legend>Modalidad</legend>
                        <div className='create-game-modes-grid'>
                            {MODES.map((mode) => (
                                <label key={mode.ruleId} className={`create-game-mode ${ruleId === mode.ruleId ? 'is-checked' : ''}`}>
                                    <input
                                        type='radio'
                                        name='create-game-mode'
                                        checked={ruleId === mode.ruleId}
                                        onChange={() => setRuleId(mode.ruleId)}
                                    />
                                    <span className='create-game-mode-figure num' aria-hidden='true'>{mode.figure}</span>
                                    <span className='create-game-mode-title'>{mode.title}</span>
                                    <span className='create-game-mode-text'>{mode.text}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div className='create-game-row'>
                        <SegmentedComponent
                            label='Jugadores'
                            value={players}
                            onChange={setPlayers}
                            options={[2, 3, 4, 5, 6].map((n) => ({value: n, label: n, ariaLabel: `${n} jugadores`}))}
                        />
                        <div className='create-game-bet'>
                            <span className='create-game-label' id='create-game-bet-label'>Apuesta por jugador</span>
                            <div className='create-game-stepper'>
                                <IconButton aria-label='Bajar la apuesta' onClick={() => stepBet(-1)} disabled={bet <= 1}><RemoveRounded/></IconButton>
                                <span className='create-game-stepper-value'>
                                    <TokenIconComponent size={18}/>
                                    <input
                                        className='num'
                                        aria-labelledby='create-game-bet-label'
                                        inputMode='numeric'
                                        value={betByPlayer}
                                        onChange={(e) => handleChangeBetByPlayer(e.target.value)}
                                    />
                                </span>
                                <IconButton aria-label='Subir la apuesta' onClick={() => stepBet(1)}><AddRounded/></IconButton>
                            </div>
                            <span className={`create-game-help ${betByPlayerError || notEnoughTokens ? 'is-error' : ''}`}>
                                {betByPlayerError || (notEnoughTokens ? `Solo tienes ${props.tokens} fichas.` : props.tokens !== undefined ? `Tienes ${props.tokens} fichas.` : ' ')}
                            </span>
                        </div>
                    </div>

                    <SegmentedComponent
                        label='Visibilidad'
                        value={isPublic}
                        onChange={setIsPublic}
                        stretch
                        options={[
                            {value: false, label: 'Privada'},
                            {value: true, label: 'Pública'},
                        ]}
                    />
                    <p className='create-game-help create-game-visibility-help'>
                        {isPublic ? 'Aparece en la lista de mesas abiertas para cualquier jugador.' : 'Solo entran quienes tengan tu enlace o el código de la mesa.'}
                    </p>

                    <div className='create-game-footer'>
                        <div className='create-game-pot'>
                            <span className='create-game-label'>Pozo</span>
                            <TokenAmountComponent amount={bet * players} size='lg'/>
                        </div>
                        <Button type='submit' variant='contained' color='secondary' size='large' disabled={loading}>Crear mesa</Button>
                    </div>
                </form>
            </section>
            <GlobalLoadingComponent loading={loading}/>
            <AlertComponent
                type={AlertTypeConstants.ERROR_ALERT}
                rawMessage={errorMessage}
                setRawMessage={setErrorMessage}
            />
            {redirect ? <Navigate to={RoutesConstants.WAITING_GAME_ROUTE}/> : <></>}
        </ThemeProvider>
    );
}
