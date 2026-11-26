import {FormEvent, JSX, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {Button, TextField} from '@mui/material';
import {ValidationUtils} from '../../../../utils/validation.utils.ts';
import {PasswordFieldComponent} from '../../../../components/password-field/password-field.component.tsx';
import {GlobalLoadingComponent} from '../../../../components/loading/global/global-loading.component.tsx';
import {AlertTypeConstants} from '../../../../utils/constants/alert.constants.ts';
import {AlertComponent} from '../../../../components/alert/alert.component.tsx';
import {RegisterRequest, RegisterResponse} from '../../../../types/services/register.ts';
import {BackendUtils} from '../../../../utils/backend.utils.tsx';
import {BackendConstants} from '../../../../utils/constants/backend.constants.ts';
import {LocaleStorageUtils} from '../../../../store/locale-storage.utils.ts';
import {LocaleStorageConstants} from '../../../../store/locale-storage.constants.ts';
import {useWebSocket} from '../../../../config/websocket.provider.tsx';

/**
 * Sign up form.
 * @param props.redirectTo Route to open after creating the account.
 */
export function RegisterComponent(props: { redirectTo: string }): JSX.Element {

    const [username, setUsername] = useState<string>('');
    const [usernameError, setUsernameError] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [passwordConfirmation, setPasswordConfirmation] = useState<string>('');
    const [passwordConfirmationError, setPasswordConfirmationError] = useState<string>('');

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

    const handleChangePassword = (value: string): void => {
        setPassword(value);
        ValidationUtils.validatePassword(value, setPasswordError);
        if (passwordConfirmation) ValidationUtils.validatePasswordConfirmation(passwordConfirmation, value, setPasswordConfirmationError);
    };

    const handleChangePasswordConfirmation = (value: string): void => {
        setPasswordConfirmation(value);
        ValidationUtils.validatePasswordConfirmation(value, password, setPasswordConfirmationError);
    };

    const handleChangeUsername = (value: string): void => {
        setUsername(value);
        ValidationUtils.validateUsername(value, setUsernameError);
    };

    /**
     * Creates the account, stores the session and opens the requested route.
     * @return {Promise<void | false>} `false` when the form is invalid.
     */
    const registerUser = async (event?: FormEvent): Promise<void | false> => {
        event?.preventDefault();
        let isValid: boolean = true;
        if (!ValidationUtils.validateUsername(username, setUsernameError)) isValid = false;
        if (!ValidationUtils.validatePassword(password, setPasswordError)) isValid = false;
        if (!ValidationUtils.validatePasswordConfirmation(passwordConfirmation, password, setPasswordConfirmationError)) isValid = false;
        if (!isValid) return isValid;
        setLoading(true);
        const body: RegisterRequest = {username: username.toLowerCase(), password};
        const res = await backendUtils.post<RegisterResponse, RegisterRequest>(BackendConstants.REGISTER_URL, body);
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
            <form className='auth-form' onSubmit={registerUser} noValidate>
                <h1>Crea tu cuenta</h1>
                <p className='auth-form-hint'>Elige un nombre de usuario: así te verán en la mesa.</p>
                <TextField
                    value={username}
                    id='register-username'
                    label='Nombre de usuario'
                    required
                    autoComplete='username'
                    autoFocus
                    error={!!usernameError}
                    helperText={usernameError || 'Mínimo 8 caracteres.'}
                    onChange={(e) => handleChangeUsername(e.target.value)}
                />
                <PasswordFieldComponent
                    passwordError={passwordError}
                    hint='8 caracteres o más, con mayúscula, minúscula, número y un carácter especial.'
                    setPassword={handleChangePassword}
                    autoComplete='new-password'
                />
                <PasswordFieldComponent
                    labelName='Confirmar contraseña'
                    passwordError={passwordConfirmationError}
                    setPassword={handleChangePasswordConfirmation}
                    autoComplete='new-password'
                />
                <Button type='submit' variant='contained' size='large' fullWidth disabled={loading}>Crear cuenta</Button>
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
