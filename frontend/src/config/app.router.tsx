import {createHashRouter, Navigate} from 'react-router-dom';
import {LandingPage} from '../pages/landing/landing.page.tsx';
import {AuthPage} from '../pages/auth/auth.page.tsx';
import {RulesPage} from '../pages/rules/rules.page.tsx';
import {LoginGuard} from './login.guard.tsx';
import {HomePage} from '../pages/home/home.page.tsx';
import {CardDesignPage} from '../pages/card-design/card-design.page.tsx';
import {WaitingGamePage} from '../pages/waiting-game/waiting-game.page.tsx';
import {GameGuard} from './game.guard.tsx';
import {JoinGamePage} from '../pages/join-game/join-game.page.tsx';
import {GamePage} from '../pages/game/game.page.tsx';
import {ShowMatchWinnerPage} from '../pages/show-match-winner/show-match-winner.page.tsx';
import {AppShellComponent} from '../components/app-shell/app-shell.component.tsx';
import {RoutesConstants} from './routes.constants.ts';

// Re-exported so existing imports keep working.
export {RoutesConstants};

/**
 * Router definition: each route and the page it renders.
 * @const
 */
export const AppRouter = createHashRouter([
    {
        path: RoutesConstants.SHOW_MATCH_WINNER,
        // When the match ends the user is no longer "playing": a session is enough.
        element: <LoginGuard element={<ShowMatchWinnerPage/>}/>
    },
    {
        path: RoutesConstants.WAITING_GAME_ROUTE,
        element: <GameGuard element={<WaitingGamePage/>}/>
    },
    {
        path: RoutesConstants.GAME,
        element: <GameGuard element={<GamePage/>}/>
    },
    {
        path: RoutesConstants.CARD_DESIGNS_ROUTE,
        element: <LoginGuard element={<AppShellComponent><CardDesignPage/></AppShellComponent>}/>
    },
    {
        path: RoutesConstants.HOME_ROUTE,
        element: <LoginGuard element={<AppShellComponent><HomePage/></AppShellComponent>}/>
    },
    {
        path: RoutesConstants.JOIN_GAME,
        element: <JoinGamePage/>
    },
    {
        path: RoutesConstants.LOGIN_ROUTE,
        element: <AuthPage mode='login'/>
    },
    {
        path: RoutesConstants.REGISTER_ROUTE,
        element: <AuthPage mode='register'/>
    },
    {
        path: RoutesConstants.RULES_ROUTE,
        element: <AppShellComponent><RulesPage/></AppShellComponent>
    },
    {
        path: RoutesConstants.DEFAULT_ROUTE,
        element: <LandingPage/>
    },
    {
        path: RoutesConstants.ALL_ROUTES,
        element: <Navigate to={RoutesConstants.DEFAULT_ROUTE} replace/>
    },
]);
