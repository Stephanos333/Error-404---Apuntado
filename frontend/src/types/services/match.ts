import {CloseType, MatchCard, PrivateHandView, PublicMatchView} from '../match.type.ts';

/**
 * Match services (`/api/matches/current`). Every command carries `version` (optimistic
 * concurrency) and `idComando` (idempotency, UUID v4). Property names are the API contract.
 */

/** Common response of the state and the commands. */
export type MatchResponse = {
    success: boolean;
    /** `false` when the command had already been applied (idempotent resend). */
    applied: boolean;
    match: PublicMatchView;
    hand: PrivateHandView | null;
};

/** Concurrency data of every command. */
export type CommandBase = {
    version: number;
    commandId: string;
};

// ---- Player intents (built by the UI) --------------------------------------------

/** Draw from the deck or the top of the discard pile. */
export type DrawIntent = {
    source: 'DECK' | 'DISCARD_PILE';
};

/** Discard a card, sending the current organization of the hand. */
export type DiscardIntent = {
    card: MatchCard;
    groups?: MatchCard[][];
};

/** Declare a close: groups, the discarded card and the leftover cards. */
export type CloseIntent = {
    closeType: CloseType;
    declaration: {
        groups: MatchCard[][];
        discard: MatchCard;
        leftovers: MatchCard[];
    };
};

// ---- Bodies the backend receives -------------------------------------------------
// The backend identifies cards by their index in the hand it sent: the client translates
// cards to indexes using the hand of the same version.

/** POST /api/matches/current/commands/draw */
export type DrawRequest = CommandBase & {
    source: 'DECK' | 'DISCARD_PILE';
};

/** POST /api/matches/current/commands/discard */
export type DiscardRequest = CommandBase & {
    card: number;
    groups?: number[][];
};

/** POST /api/matches/current/commands/close */
export type CloseRequest = CommandBase & {
    type: CloseType;
    groups: number[][];
    discard: number;
};
