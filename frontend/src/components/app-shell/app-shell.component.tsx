import {JSX, ReactNode, useState} from 'react';
import {Link, NavLink} from 'react-router-dom';
import {Button, Tooltip} from '@mui/material';
import {MenuBookRounded, StyleRounded, TableRestaurantRounded} from '@mui/icons-material';
import {BrandComponent} from '../brand/brand.component.tsx';
import {TokenAmountComponent} from '../token/token.component.tsx';
import {ProfileDialogComponent} from './profile-dialog.component.tsx';
import {hasSession, UserProvider, useUser} from '../../config/user.context.tsx';
import {RoutesConstants} from '../../config/routes.constants.ts';
import {buildProfileImageRoute} from '../../utils/profile-image.utils.ts';
import './app-shell.component.css';

/** Main navigation entries (desktop top bar and mobile bottom bar). */
const NAV_ITEMS = [
    {to: RoutesConstants.HOME_ROUTE, label: 'Jugar', icon: <TableRestaurantRounded/>, private: true},
    {to: RoutesConstants.CARD_DESIGNS_ROUTE, label: 'Diseños', icon: <StyleRounded/>, private: true},
    {to: RoutesConstants.RULES_ROUTE, label: 'Cómo jugar', icon: <MenuBookRounded/>, private: false},
];

/**
 * Top bar: brand, navigation, tokens and the avatar that opens the profile.
 * Without a session it shows the log in / sign up actions instead.
 */
export function TopBarComponent(): JSX.Element {
    const {user, refreshUser} = useUser();
    const [profileOpen, setProfileOpen] = useState<boolean>(false);
    const loggedIn: boolean = hasSession();
    const items = NAV_ITEMS.filter((item) => loggedIn || !item.private);

    return (
        <>
            <header className='top-bar'>
                <div className='top-bar-inner page-width'>
                    <Link to={loggedIn ? RoutesConstants.HOME_ROUTE : RoutesConstants.DEFAULT_ROUTE} className='top-bar-brand' aria-label='Apuntado, ir al inicio'>
                        <BrandComponent size='sm'/>
                    </Link>
                    <nav className='top-bar-nav' aria-label='Principal'>
                        {items.map((item) => (
                            <NavLink key={item.to} to={item.to} className='top-bar-link'>{item.label}</NavLink>
                        ))}
                    </nav>
                    <div className='top-bar-end'>
                        {
                            loggedIn
                                ? <>
                                    <Tooltip title='Tus fichas' arrow>
                                        <span className='top-bar-tokens'>
                                            <TokenAmountComponent amount={user ? user.tokens : '—'}/>
                                        </span>
                                    </Tooltip>
                                    <button
                                        type='button'
                                        className='top-bar-avatar'
                                        onClick={() => setProfileOpen(true)}
                                        aria-label='Abrir perfil'
                                    >
                                        {user ? <img alt='' src={buildProfileImageRoute(user.icon)}/> : <span className='top-bar-avatar-placeholder'/>}
                                        <span className='top-bar-avatar-name'>{user?.username ?? ''}</span>
                                    </button>
                                </>
                                : <>
                                    <Button component={Link} to={RoutesConstants.LOGIN_ROUTE} color='inherit' className='top-bar-login'>Entrar</Button>
                                    <Button component={Link} to={RoutesConstants.REGISTER_ROUTE} variant='contained'>Crear cuenta</Button>
                                </>
                        }
                    </div>
                </div>
            </header>
            {
                loggedIn
                    ? <nav className='bottom-nav' aria-label='Principal'>
                        {items.map((item) => (
                            <NavLink key={item.to} to={item.to} className='bottom-nav-link'>
                                {item.icon}
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                    : <></>
            }
            <ProfileDialogComponent
                user={user}
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                onUserChange={refreshUser}
            />
        </>
    );
}

/**
 * Layout for the pages with navigation: top bar, page content and, on phones, the bottom
 * navigation bar.
 * @param children The page.
 * @param bleed Removes the main padding so the page can draw full-width sections.
 */
export function AppShellComponent({children, bleed}: { children: ReactNode; bleed?: boolean }): JSX.Element {
    return (
        <UserProvider>
            <div className='app-shell'>
                <TopBarComponent/>
                <main className={`app-shell-main ${bleed ? 'app-shell-main-bleed' : ''}`}>{children}</main>
            </div>
        </UserProvider>
    );
}
