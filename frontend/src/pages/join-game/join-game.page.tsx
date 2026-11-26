import {JSX, useEffect, useState} from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {RoutesConstants} from '../../config/routes.constants.ts';
import {hasSession} from '../../config/user.context.tsx';
import {BackendUtils} from '../../utils/backend.utils.tsx';
import {JoinGameRequest, JoinGameResponse} from '../../types/services/join-game.ts';
import {BackendConstants} from '../../utils/constants/backend.constants.ts';
import {CardBackComponent} from '../../components/card/card.component.tsx';
import './join-game.page.css';

/**
 * Opens an invitation link (`#/game/join?gameId=…`): joins the game and goes to the
 * waiting room. Without a session it asks to log in first and comes back here.
 */
export function JoinGamePage(): JSX.Element {
    const location = useLocation();
    const [redirectRoute, setRedirectRoute] = useState<string | undefined>();

    useEffect(() => {
        async function join(): Promise<void> {
            // With the hash router the query lives inside the hash, so it is read from the router.
            const gameId: string | null = new URLSearchParams(location.search).get('gameId');
            if (!gameId) {
                setRedirectRoute(hasSession() ? RoutesConstants.HOME_ROUTE : RoutesConstants.DEFAULT_ROUTE);
                return;
            }
            if (!hasSession()) {
                const back: string = encodeURIComponent(`${RoutesConstants.JOIN_GAME}?gameId=${gameId}`);
                setRedirectRoute(`${RoutesConstants.LOGIN_ROUTE}?redirect=${back}`);
                return;
            }
            let errorCode: string | undefined;
            const backendUtils: BackendUtils = new BackendUtils((message) => {
                errorCode = message;
            });
            const res = await backendUtils.patch<JoinGameResponse, JoinGameRequest>(BackendConstants.JOIN_GAME_URL, {gameId});
            if (res) setRedirectRoute(RoutesConstants.WAITING_GAME_ROUTE);
            else setRedirectRoute(`${RoutesConstants.HOME_ROUTE}?joinError=${encodeURIComponent(errorCode ?? 'UNKNOWN_ERROR')}`);
        }

        join().then();
    }, []);

    if (redirectRoute) return <Navigate to={redirectRoute} replace/>;

    return (
        <div className='join-game-page page-container' role='status'>
            <div className='join-game-deck' aria-hidden='true'>
                <CardBackComponent/>
                <CardBackComponent/>
                <CardBackComponent/>
            </div>
            <p>Buscando tu mesa…</p>
        </div>
    );
}
