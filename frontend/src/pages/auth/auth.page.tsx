import {JSX} from 'react';
import {Link, Navigate, NavLink, useLocation} from 'react-router-dom';
import {ThemeProvider} from '@mui/material';
import {BrandComponent} from '../../components/brand/brand.component.tsx';
import {CardFanComponent} from '../../components/card-fan/card-fan.component.tsx';
import {PaperTheme} from '../../config/app.theme.tsx';
import {RoutesConstants} from '../../config/routes.constants.ts';
import {hasSession} from '../../config/user.context.tsx';
import {LoginComponent} from './ui/login/login.component.tsx';
import {RegisterComponent} from './ui/register/register.component.tsx';
import './auth.page.css';

/**
 * Reads the `redirect` query parameter (set by the guards and the invitation links) and
 * accepts it only when it is an in-app route.
 * @param {string} search The router location search string.
 * @returns {string | null} The route to return to after authenticating.
 */
export function readRedirect(search: string): string | null {
    const redirect: string | null = new URLSearchParams(search).get('redirect');
    return redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : null;
}

/**
 * Log in and sign up page. Both forms share the page; the tabs are routes so each one has
 * its own address (`/login` and `/register`).
 * @param props.mode The form to show.
 */
export function AuthPage(props: { mode: 'login' | 'register' }): JSX.Element {
    const location = useLocation();
    const redirect: string | null = readRedirect(location.search);
    const target: string = redirect ?? RoutesConstants.HOME_ROUTE;
    // Keeps the pending redirect when switching tabs.
    const suffix: string = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';

    if (hasSession()) return <Navigate to={target} replace/>;

    return (
        <div className='auth-page page-container'>
            <aside className='auth-aside'>
                <Link to={RoutesConstants.DEFAULT_ROUTE} className='auth-brand' aria-label='Apuntado, volver al inicio'>
                    <BrandComponent size='md'/>
                </Link>
                <div className='auth-aside-table' aria-hidden='true'>
                    <CardFanComponent
                        designName='DEFAULT'
                        spread={7}
                        groups={[[{suit: 'HEART', type: 'A'}, {suit: 'SPADE', type: 'A'}, {suit: 'DIAMOND', type: 'A'}]]}
                    />
                </div>
                <p className='auth-aside-text'>
                    {props.mode === 'login'
                        ? 'Tu mesa te está esperando.'
                        : 'Crea tu cuenta y recibe 100 fichas para tu primera mesa.'}
                </p>
            </aside>

            <main className='auth-main'>
                <ThemeProvider theme={PaperTheme}>
                    <div className='auth-panel paper'>
                        <nav className='auth-tabs' aria-label='Acceso'>
                            <NavLink to={`${RoutesConstants.LOGIN_ROUTE}${suffix}`} className='auth-tab' replace>Entrar</NavLink>
                            <NavLink to={`${RoutesConstants.REGISTER_ROUTE}${suffix}`} className='auth-tab' replace>Crear cuenta</NavLink>
                        </nav>
                        {
                            redirect && redirect.startsWith(RoutesConstants.JOIN_GAME)
                                ? <p className='auth-invite'>Te invitaron a una mesa. Entra o crea tu cuenta y te llevamos a la sala.</p>
                                : <></>
                        }
                        {props.mode === 'login' ? <LoginComponent redirectTo={target}/> : <RegisterComponent redirectTo={target}/>}
                    </div>
                </ThemeProvider>
                <Link to={RoutesConstants.RULES_ROUTE} className='auth-rules-link'>¿Primera vez? Mira cómo se juega</Link>
            </main>
        </div>
    );
}
