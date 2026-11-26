import React, {useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {RoutesConstants} from './routes.constants.ts';
import {BackendUtils} from '../utils/backend.utils.tsx';
import {GetMeResponse} from '../types/services/get-me.ts';
import {BackendConstants} from '../utils/constants/backend.constants.ts';
import {UserStatusConstants} from '../utils/constants/user.constants.ts';
import {GlobalLoadingComponent} from '../components/loading/global/global-loading.component.tsx';
import {hasSession} from './user.context.tsx';

/**
 * Route guard for pages that require the user to be playing (waiting room and table).
 * @param element The page to render when allowed.
 * @returns {React.ReactNode} The page, a loader or a redirect.
 */
export const GameGuard = ({element}: { element: React.ReactNode }): React.ReactNode => {

    /** Route to redirect to when the user is not playing. */
    const [route, setRoute] = useState<string>(RoutesConstants.LOGIN_ROUTE);
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData(): Promise<void> {
            if (hasSession()) {
                const backendUtils: BackendUtils = new BackendUtils();
                const res = await backendUtils.get<GetMeResponse, never>(BackendConstants.GET_ME_URL);
                if (res && res.user.status === UserStatusConstants.PLAYING) setIsValid(true);
                setRoute(RoutesConstants.HOME_ROUTE);
            }
            setIsLoading(false);
        }

        fetchData().then();
    }, []);

    return isLoading ? <GlobalLoadingComponent loading={isLoading}/> : isValid ? <>{element}</> : <Navigate to={route}/>;
};
