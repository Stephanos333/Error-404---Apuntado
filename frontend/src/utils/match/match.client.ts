/**
 * Client of the match commands (`/api/matches/current`).
 *
 * - Generates a UUID v4 `idComando` per intent (the same id on a retry is idempotent).
 * - Sends the `version` of the last known state (optimistic concurrency).
 * - Translates cards into indexes using the hand of that same version.
 * - If the backend answers a concurrency error (409), it fetches the state again.
 */
import {BackendUtils} from '../backend.utils.tsx';
import {BackendConstants} from '../constants/backend.constants.ts';
import {MatchCard} from '../../types/match.type.ts';
import {CloseIntent, CloseRequest, DiscardIntent, DiscardRequest, DrawIntent, DrawRequest, MatchResponse} from '../../types/services/match.ts';
import {closeBody, discardBody, drawBody, generateCommandId, InvalidIntentError, shouldRefresh} from './match.utils.ts';

/** Result of a command: the new state or the controlled error code. */
export type CommandResult =
    | { ok: true; response: MatchResponse }
    | { ok: false; code: string; refreshed?: MatchResponse };

/** Minimum state the client needs to build a command. */
export type LocalState = {
    version: number;
    hand: MatchCard[];
};

export class MatchClient {
    /**
     * @param {() => LocalState | undefined} currentState Returns the version and hand shown on the table.
     */
    constructor(private readonly currentState: () => LocalState | undefined) {
    }

    /** GET /api/matches/current: public view + the user's hand (also used to reconnect). */
    async fetchState(): Promise<CommandResult> {
        return this.execute((backend) => backend.get<MatchResponse, never>(BackendConstants.MATCH_STATE_URL));
    }

    /** Draw command. */
    async draw(intent: DrawIntent): Promise<CommandResult> {
        return this.command((state, commandId) => {
            const body: DrawRequest = drawBody(intent, state.version, commandId);
            return (backend) => backend.post<MatchResponse, DrawRequest>(BackendConstants.MATCH_DRAW_URL, body);
        });
    }

    /** Discard command. */
    async discard(intent: DiscardIntent): Promise<CommandResult> {
        return this.command((state, commandId) => {
            const body: DiscardRequest = discardBody(state.hand, intent, state.version, commandId);
            return (backend) => backend.post<MatchResponse, DiscardRequest>(BackendConstants.MATCH_DISCARD_URL, body);
        });
    }

    /** Close command (4-3-3 or knock). */
    async close(intent: CloseIntent): Promise<CommandResult> {
        return this.command((state, commandId) => {
            const body: CloseRequest = closeBody(state.hand, intent, state.version, commandId);
            return (backend) => backend.post<MatchResponse, CloseRequest>(BackendConstants.MATCH_CLOSE_URL, body);
        });
    }

    /**
     * Builds the command with the current state. If the intent does not match the hand,
     * nothing is sent. If the backend rejects it for concurrency, the state is fetched again.
     */
    private async command(
        build: (state: LocalState, commandId: string) => (backend: BackendUtils) => Promise<MatchResponse | undefined>,
    ): Promise<CommandResult> {
        const state = this.currentState();
        if (!state) return {ok: false, code: 'MATCH_NOT_FOUND'};
        let send: (backend: BackendUtils) => Promise<MatchResponse | undefined>;
        try {
            send = build(state, generateCommandId());
        } catch (e) {
            return {ok: false, code: e instanceof InvalidIntentError ? e.code : 'UNKNOWN_ERROR'};
        }
        const result = await this.execute(send);
        if (result.ok || !shouldRefresh(result.code)) return result;
        const refresh = await this.fetchState();
        return {...result, refreshed: refresh.ok ? refresh.response : undefined};
    }

    /** Runs the call and captures the backend's controlled error code. */
    private async execute(call: (backend: BackendUtils) => Promise<MatchResponse | undefined>): Promise<CommandResult> {
        let code = 'UNKNOWN_ERROR';
        const backend = new BackendUtils((message: string) => {
            code = message;
        });
        const response = await call(backend);
        return response ? {ok: true, response} : {ok: false, code};
    }
}
