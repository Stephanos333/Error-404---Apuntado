import React from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {RoutesConstants} from './routes.constants.ts';
import {hasSession} from './user.context.tsx';

/**
 * Route guard for pages that need a session. Without one it sends the user to log in and
 * keeps the requested route so the login can bring them back.
 * @param element The page to render when allowed.
 * @returns {React.ReactNode} The page or a redirect.
 */
export const LoginGuard = ({element}: { element: React.ReactNode }): React.ReactNode => {
    const location = useLocation();
    if (hasSession()) return <>{element}</>;
    const redirect: string = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`${RoutesConstants.LOGIN_ROUTE}?redirect=${redirect}`} replace/>;
};
