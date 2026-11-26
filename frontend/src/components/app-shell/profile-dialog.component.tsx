import {JSX, useState} from 'react';
import {Link} from 'react-router-dom';
import {Button, CircularProgress, Dialog, DialogContent, IconButton, ThemeProvider} from '@mui/material';
import {CloseRounded, LogoutRounded} from '@mui/icons-material';
import {UserType} from '../../types/user.type.ts';
import {PaperTheme} from '../../config/app.theme.tsx';
import {buildProfileImageRoute} from '../../utils/profile-image.utils.ts';
import {CardComponent} from '../card/card.component.tsx';
import {CardSuitsConstants} from '../../utils/constants/card-suits.constants.ts';
import {CardDesignTitleConstants} from '../../utils/constants/card-design.constants.ts';
import {TokenAmountComponent} from '../token/token.component.tsx';
import {BackendUtils} from '../../utils/backend.utils.tsx';
import {BackendConstants} from '../../utils/constants/backend.constants.ts';
import {UpdateUserIconRequest, UpdateUserIconResponse} from '../../types/services/update-user-icon.ts';
import {AlertComponent} from '../alert/alert.component.tsx';
import {AlertTypeConstants} from '../../utils/constants/alert.constants.ts';
import {RoutesConstants} from '../../config/app.router.tsx';
import {logout} from '../../config/user.context.tsx';
import './profile-dialog.component.css';

/** Avatars a player can choose. */
export const AVATARS: ReadonlyArray<string> = ['ICON1', 'ICON2', 'ICON3', 'ICON4', 'ICON5'];

/**
 * Player profile: avatar, tokens, card design and logout.
 * @param props.user The authenticated user.
 * @param props.open Whether the dialog is open.
 * @param props.onClose Closes the dialog.
 * @param props.onUserChange Called after a saved change to reload the user.
 */
export function ProfileDialogComponent(props: {
    user: UserType | undefined;
    open: boolean;
    onClose: () => void;
    onUserChange: () => Promise<void>;
}): JSX.Element {
    const [savingIcon, setSavingIcon] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const {user} = props;

    /**
     * Saves the chosen avatar and reloads the user without reloading the page.
     * @param {string} icon The avatar.
     */
    const saveIcon = async (icon: string): Promise<void> => {
        if (!user || icon === user.icon || savingIcon) return;
        setSavingIcon(icon);
        const backendUtils: BackendUtils = new BackendUtils((message: string) => setErrorMessage(message));
        const res = await backendUtils.patch<UpdateUserIconResponse, UpdateUserIconRequest>(BackendConstants.UPDATE_USER_ICON_URL, {icon});
        if (res) await props.onUserChange();
        setSavingIcon(null);
    };

    return (
        <ThemeProvider theme={PaperTheme}>
            <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth='xs' aria-labelledby='profile-dialog-title'>
                <DialogContent className='profile-dialog'>
                    <IconButton className='profile-dialog-close' aria-label='Cerrar' onClick={props.onClose}>
                        <CloseRounded/>
                    </IconButton>
                    {
                        user
                            ? <>
                                <header className='profile-dialog-header'>
                                    <img className='profile-dialog-avatar' alt='' src={buildProfileImageRoute(user.icon)}/>
                                    <div>
                                        <h2 id='profile-dialog-title'>{user.username}</h2>
                                        <TokenAmountComponent amount={user.tokens}/>
                                    </div>
                                </header>

                                <section className='profile-dialog-section' aria-labelledby='profile-avatar-title'>
                                    <h3 id='profile-avatar-title'>Avatar</h3>
                                    <div className='profile-dialog-avatars' role='radiogroup' aria-labelledby='profile-avatar-title'>
                                        {AVATARS.map((icon, i) => (
                                            <button
                                                key={icon}
                                                type='button'
                                                role='radio'
                                                aria-checked={icon === user.icon}
                                                aria-label={`Avatar ${i + 1}`}
                                                className={`profile-dialog-avatar-option ${icon === user.icon ? 'is-current' : ''}`}
                                                onClick={() => saveIcon(icon)}
                                            >
                                                <img alt='' src={buildProfileImageRoute(icon)}/>
                                                {savingIcon === icon ? <span className='profile-dialog-avatar-saving'><CircularProgress size={20} color='inherit'/></span> : <></>}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className='profile-dialog-section profile-dialog-design'>
                                    <CardComponent
                                        type='A'
                                        suit={CardSuitsConstants.SPADE}
                                        designName={user.currentDesignName}
                                        positionClassName='profile-dialog-design-card'
                                    />
                                    <div>
                                        <h3>Tus cartas</h3>
                                        <p className='muted'>Diseño {CardDesignTitleConstants[user.currentDesignName] ?? user.currentDesignName}</p>
                                        <Button
                                            component={Link}
                                            to={RoutesConstants.CARD_DESIGNS_ROUTE}
                                            variant='outlined'
                                            size='small'
                                            onClick={props.onClose}
                                        >Cambiar diseño</Button>
                                    </div>
                                </section>

                                <footer className='profile-dialog-footer'>
                                    <Button color='error' startIcon={<LogoutRounded/>} onClick={logout}>Cerrar sesión</Button>
                                    <Button variant='contained' onClick={props.onClose}>Listo</Button>
                                </footer>
                            </>
                            : <div className='profile-dialog-loading'><CircularProgress color='inherit'/></div>
                    }
                </DialogContent>
            </Dialog>
            <AlertComponent type={AlertTypeConstants.ERROR_ALERT} rawMessage={errorMessage} setRawMessage={setErrorMessage}/>
        </ThemeProvider>
    );
}
