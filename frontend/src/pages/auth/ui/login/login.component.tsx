import {FormEvent, JSX, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {Button, TextField} from '@mui/material';
import {PasswordFieldComponent} from '../../../../components/password-field/password-field.component.tsx';
import {GlobalLoadingComponent} from '../../../../components/loading/global/global-loading.component.tsx';
import {AlertComponent} from '../../../../components/alert/alert.component.tsx';
import {ValidationUtils} from '../../../../utils/validation.utils.ts';
import {LoginRequest, LoginResponse} from '../../../../types/services/login.ts';
import {BackendUtils} from '../../../../utils/backend.utils.tsx';
import {AlertTypeConstants} from '../../../../utils/constants/alert.constants.ts';
import {BackendConstants} from '../../../../utils/constants/backend.constants.ts';
import {LocaleStorageUtils} from '../../../../store/locale-storage.utils.ts';
import {LocaleStorageConstants} from '../../../../store/locale-storage.constants.ts';
import {useWebSocket} from '../../../../config/websocket.provider.tsx';

/**
 * Log in form.
 * @param props.redirectTo Route to open after logging in.
 */
export function LoginComponent(props: { redirectTo: string }): JSX.Element {

    const [username, setUsername] = useState<string>('');
    const [usernameError, setUsernameError] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');

    const [loading, setLoading] = useState<boolean>(false);
    const [redirect, setRedirect] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const {connectWebSocket} = useWebSocket();

    const backendUtils: BackendUtils = new BackendUtils(
        (message: string) => {
            setLoading(false);
            setErrorMessage(message);
        }
    );

    const handleChangeUsername = (value: string): void => {
        setUsername(value);
        ValidationUtils.validateUsername(value, setUsernameError);
    };

    const handleChangePassword = (value: string): void => {
        setPassword(value);
        ValidationUtils.validatePassword(value, setPasswordError);
    };

    /**
     * Logs the user in, stores the session and opens the requested route.
     * @return {Promise<void | false>} `false` when the form is invalid.
     */
    const loginUser = async (event?: FormEvent): Promise<void | false> => {
        event?.preventDefault();
        let isValid: boolean = true;
        if (!ValidationUtils.validateUsername(username, setUsernameError)) isValid = false;
        if (!ValidationUtils.validatePassword(password, setPasswordError)) isValid = false;
        if (!isValid) return isValid;
        setLoading(true);
        const body: LoginRequest = {username: username.toLowerCase(), password};
        const res = await backendUtils.post<LoginResponse, LoginRequest>(BackendConstants.LOGIN_URL, body);
        if (res) {
            LocaleStorageUtils.set<LocaleStorageConstants.KEY_ACCESS_TOKEN>(LocaleStorageConstants.KEY_ACCESS_TOKEN, res.accessToken);
            LocaleStorageUtils.set<LocaleStorageConstants.KEY_REFRESH_TOKEN>(LocaleStorageConstants.KEY_REFRESH_TOKEN, res.refreshToken);
            LocaleStorageUtils.set<LocaleStorageConstants.KEY_USER_ID>(LocaleStorageConstants.KEY_USER_ID, res.userId);
            setLoading(false);
            connectWebSocket();
            setRedirect(true);
        }
    };

    return (
        <>
            <form className='auth-form' onSubmit={loginUser} noValidate>
                <h1>Bienvenido de vuelta</h1>
                <p className='auth-form-hint'>Entra con tu nombre de usuario.</p>
                <TextField
                    value={username}
                    id='login-username'
                    label='Nombre de usuario'
                    required
                    autoComplete='username'
                    autoFocus
                    error={!!usernameError}
                    helperText={usernameError || ' '}
                    onChange={(e) => handleChangeUsername(e.target.value)}
                />
                <PasswordFieldComponent
                    passwordError={passwordError}
                    setPassword={handleChangePassword}
                />
                <Button type='submit' variant='contained' size='large' fullWidth disabled={loading}>Entrar</Button>
            </form>
            <AlertComponent
                type={AlertTypeConstants.ERROR_ALERT}
                rawMessage={errorMessage}
                setRawMessage={setErrorMessage}
            />
            <GlobalLoadingComponent loading={loading}/>
            {redirect ? <Navigate to={props.redirectTo} replace/> : <></>}
        </>
    );
}
