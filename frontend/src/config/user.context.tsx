import {createContext, ReactNode, useCallback, useContext, useEffect, useState} from 'react';
import {UserType} from '../types/user.type.ts';
import {BackendUtils} from '../utils/backend.utils.tsx';
import {GetMeResponse} from '../types/services/get-me.ts';
import {BackendConstants} from '../utils/constants/backend.constants.ts';
import {LocaleStorageUtils} from '../store/locale-storage.utils.ts';
import {LocaleStorageConstants} from '../store/locale-storage.constants.ts';

/** Authenticated user shared by the pages that render the top bar. */
type UserContextType = {
    /** `undefined` while loading or when there is no session. */
    user: UserType | undefined;
    /** Fetches `GET /api/user/me` again (e.g. after changing the avatar). */
    refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
    user: undefined,
    refreshUser: async () => undefined,
});

/** Whether the browser holds a session token. */
export const hasSession = (): boolean =>
    !!LocaleStorageUtils.get<LocaleStorageConstants.KEY_ACCESS_TOKEN>(LocaleStorageConstants.KEY_ACCESS_TOKEN);

/**
 * Loads the authenticated user once and exposes it to the top bar and the page.
 * @param children The page content.
 */
export function UserProvider({children}: { children: ReactNode }) {
    const [user, setUser] = useState<UserType | undefined>(undefined);

    const refreshUser = useCallback(async (): Promise<void> => {
        if (!hasSession()) return;
        const res = await new BackendUtils().get<GetMeResponse, never>(BackendConstants.GET_ME_URL);
        if (res) setUser(res.user);
    }, []);

    useEffect(() => {
        refreshUser().then();
    }, [refreshUser]);

    return <UserContext.Provider value={{user, refreshUser}}>{children}</UserContext.Provider>;
}

/** Reads the authenticated user. */
export const useUser = (): UserContextType => useContext(UserContext);

/**
 * Logs out: removes the stored keys and reloads on the landing page, so the previous
 * user's socket is closed too.
 */
export function logout(): void {
    Object.values(LocaleStorageConstants).forEach(LocaleStorageUtils.del);
    window.location.href = '/#/';
    window.location.reload();
}
