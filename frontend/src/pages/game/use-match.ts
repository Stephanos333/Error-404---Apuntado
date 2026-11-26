import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Socket} from 'socket.io-client';
import {PrivateHandMessage, PrivateHandView, PublicMatchMessage, PublicMatchView} from '../../types/match.type.ts';
import {MatchResponse} from '../../types/services/match.ts';
import {PUBLIC_MATCH_MESSAGES, SocketConstants} from '../../utils/constants/socket.constants.ts';
import {CommandResult, MatchClient} from '../../utils/match/match.client.ts';
import {compareVersion} from '../../utils/match/match.utils.ts';

/** Live match state consumed by the table. */
export type LiveMatch = {
    match: PublicMatchView | undefined;
    /** `undefined` while loading; `null` when the user has no hand (eliminated). */
    hand: PrivateHandView | null | undefined;
    client: MatchClient;
    /** Applies a command response (or the state fetched again after a concurrency error). */
    applyResult: (result: CommandResult) => void;
};

/**
 * Keeps the public view and the user's hand in sync with the backend.
 *
 * - First load and reconnection: `GET /api/partidas/actual`.
 * - Real time: on connect it emits `GAME_CONNECTION_EVENT`; the backend joins the socket to
 *   the public room `partida:{gameId}` and the private room `usuario:{userId}`.
 * - Versions: it never goes back. A socket message that skips versions (one was lost)
 *   triggers a full refetch.
 * @param {Socket | undefined} socket The `game` namespace socket.
 * @param {(message: PublicMatchMessage) => void} onMessage Called with each applied public message.
 */
export function useMatch(socket: Socket | undefined, onMessage: (message: PublicMatchMessage) => void): LiveMatch {
    const [match, setMatch] = useState<PublicMatchView | undefined>();
    const [hand, setHand] = useState<PrivateHandView | null | undefined>();
    const matchRef = useRef<PublicMatchView | undefined>();
    const handRef = useRef<PrivateHandView | null | undefined>();
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    const client = useMemo(() => new MatchClient(() => {
        const m = matchRef.current;
        const h = handRef.current;
        return m && h ? {version: m.version, hand: h.cartas} : undefined;
    }), []);

    const putMatch = useCallback((next: PublicMatchView): void => {
        matchRef.current = next;
        setMatch(next);
    }, []);

    const putHand = useCallback((next: PrivateHandView | null): void => {
        const current = handRef.current;
        if (next && current && next.version < current.version) return;
        handRef.current = next;
        setHand(next);
    }, []);

    /** HTTP response (command or refetch): authoritative unless older than what is shown. */
    const applyResponse = useCallback((response: MatchResponse): void => {
        const current = matchRef.current?.version;
        if (current !== undefined && response.partida.version < current) return;
        putMatch(response.partida);
        putHand(response.mano);
    }, [putMatch, putHand]);

    const refresh = useCallback(async (): Promise<void> => {
        const result = await client.fetchState();
        if (result.ok) applyResponse(result.response);
    }, [client, applyResponse]);

    const applyResult = useCallback((result: CommandResult): void => {
        if (result.ok) applyResponse(result.response);
        else if (result.refreshed) applyResponse(result.refreshed);
    }, [applyResponse]);

    useEffect(() => {
        refresh().then();
    }, [refresh]);

    useEffect(() => {
        if (!socket) return;
        const handleConnect = (): void => {
            socket.emit(SocketConstants.GAME_CONNECTION_EVENT);
            // Messages may have been lost while reconnecting: fetch the full state.
            refresh().then();
        };
        const handlePublic = (message: PublicMatchMessage): void => {
            const decision = compareVersion(matchRef.current?.version, message.partida.version);
            if (decision === 'IGNORE') return;
            if (decision === 'REFRESH') {
                refresh().then();
                return;
            }
            putMatch(message.partida);
            onMessageRef.current(message);
        };
        const handlePrivate = (message: PrivateHandMessage): void => putHand(message.mano);

        if (socket.connected) socket.emit(SocketConstants.GAME_CONNECTION_EVENT);
        socket.on('connect', handleConnect);
        PUBLIC_MATCH_MESSAGES.forEach((name) => socket.on(name, handlePublic));
        socket.on(SocketConstants.PRIVATE_HAND_LISTENER, handlePrivate);
        return () => {
            socket.off('connect', handleConnect);
            PUBLIC_MATCH_MESSAGES.forEach((name) => socket.off(name, handlePublic));
            socket.off(SocketConstants.PRIVATE_HAND_LISTENER, handlePrivate);
        };
    }, [socket, refresh, putMatch, putHand]);

    return {match, hand, client, applyResult};
}
