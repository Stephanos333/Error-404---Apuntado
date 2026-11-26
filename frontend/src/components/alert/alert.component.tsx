import {Alert, Snackbar} from '@mui/material';
import {Dispatch, JSX, SetStateAction} from 'react';
import {AlertMessagesConstants, AlertTypeConstants} from '../../utils/constants/alert.constants.ts';

/**
 * App-wide toast alert.
 * @param {AlertTypeConstants} props.type The alert severity.
 * @param {string} props.rawMessage The message code to show (see AlertMessagesConstants).
 * @param {Dispatch<SetStateAction<string>>} props.setRawMessage Resets the message.
 */
export function AlertComponent(
    props: {
        type: AlertTypeConstants,
        rawMessage: string;
        setRawMessage: Dispatch<SetStateAction<string>>;
    }
): JSX.Element {
    const message: string = AlertMessagesConstants[props.rawMessage] || AlertMessagesConstants.UNKNOWN_ERROR;
    // Longer messages stay longer so they can be read.
    const duration: number = Math.min(7000, 2500 + message.length * 40);
    return (
        <Snackbar
            open={!!props.rawMessage}
            autoHideDuration={duration}
            onClose={(_, reason) => reason !== 'clickaway' && props.setRawMessage('')}
        >
            <Alert
                variant='filled'
                severity={props.type}
                sx={{width: '100%', maxWidth: 520}}
                onClose={() => props.setRawMessage('')}
            >
                {message}
            </Alert>
        </Snackbar>
    );
}
