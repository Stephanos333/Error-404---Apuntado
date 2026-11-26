import {Visibility, VisibilityOff} from '@mui/icons-material';
import {IconButton, InputAdornment, TextField} from '@mui/material';
import {JSX, useId, useState} from 'react';

/**
 * Password input with a show/hide toggle.
 * @param {string} [props.classname] Extra class for the field.
 * @param {string} [props.labelName] Field label.
 * @param {string} props.passwordError Validation error.
 * @param {(value: string) => void} props.setPassword Stores the password.
 * @param {string} [props.autoComplete] Browser autocomplete hint.
 * @param {string} [props.hint] Help text shown while there is no error.
 */
export function PasswordFieldComponent(
    props: {
        classname?: string;
        labelName?: string;
        passwordError: string;
        setPassword: (value: string) => void;
        autoComplete?: string;
        hint?: string;
    }
): JSX.Element {

    /** Whether the password is visible. */
    const [show, setShow] = useState<boolean>(false);
    const id = useId();

    return (
        <TextField
            id={id}
            className={props.classname}
            required
            label={props.labelName || 'Contraseña'}
            type={show ? 'text' : 'password'}
            autoComplete={props.autoComplete ?? 'current-password'}
            error={!!props.passwordError}
            helperText={props.passwordError || props.hint || ' '}
            onChange={(e) => props.setPassword(e.target.value)}
            InputProps={{
                endAdornment: (
                    <InputAdornment position='end'>
                        <IconButton
                            edge='end'
                            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            onClick={() => setShow(!show)}
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            {show ? <VisibilityOff/> : <Visibility/>}
                        </IconButton>
                    </InputAdornment>
                ),
            }}
        />
    );
}
