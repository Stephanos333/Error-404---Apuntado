/**
 * Types of the Match aggregate as the backend exposes them (ADR-04/ADR-05).
 * The public view goes to the `match:{id}` room; the private one (the hand) only to
 * `user:{id}`.
 *
 * Property names and literal values are the backend API contract and stay in Spanish
 * (`valor`, `palo`, `jugadores`, `'EN_JUEGO'`…); only the TypeScript names are English.
 */

/** Card ranks of the document model. */
export type CardRank = 'ACE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE' | 'SIX' | 'SEVEN' | 'EIGHT' | 'NINE' | 'TEN' | 'J' | 'Q' | 'K';

/** Card suits of the document model. */
export type CardSuit = 'CLUBS' | 'DIAMONDS' | 'HEARTS' | 'SPADES';

/** A card in the match. `baraja` (deck 1 or 2) tells apart two equal cards when two decks are used. */
export type MatchCard = {
    rank: CardRank;
    suit: CardSuit;
    deckNumber: number;
};

export type MatchStatus = 'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS' | 'FINISHED' | 'CANCELLED';
export type MatchPlayerStatus = 'IN_LOBBY' | 'ACTIVE' | 'ELIMINATED' | 'WINNER' | 'LOSER';
export type RoundStatus = 'DEALING' | 'IN_TURNS' | 'EXTRA_ROUND' | 'SETTLING' | 'CLOSED';
export type TurnPhase = 'AWAITING_DRAW' | 'HOLDING_11_CARDS';
export type CloseType = 'WIN_4_3_3' | 'KNOCK';

export type PublicPlayerView = {
    playerId: string;
    username: string;
    position: number;
    status: MatchPlayerStatus;
    score: number;
    connected: boolean;
    /** Only the hand size: opponents' cards never reach the client. */
    cardsInHand: number;
};

export type PublicRoundView = {
    number: number;
    status: RoundStatus;
    turn: { playerId: string; phase: TurnPhase; closeAttempted: boolean; number: number };
    cardsInDeck: number;
    cardsInDiscardPile: number;
    topDiscard: MatchCard | null;
    extraRound: { knockerId: string; pending: string[] } | null;
};

export type ScoreboardEntryView = {
    roundNumber: number;
    winnerId: string;
    closeType: CloseType;
    points: Array<{ playerId: string; roundPoints: number; cumulative: number; eliminated: boolean }>;
};

/** Public view of the match. */
export type PublicMatchView = {
    matchId: string;
    version: number;
    status: MatchStatus;
    mode: string;
    winnerId: string | null;
    pot: { total: number };
    players: PublicPlayerView[];
    round: PublicRoundView | null;
    scoreboard: ScoreboardEntryView[];
};

/** Private view: the authenticated user's hand. `grupos` are indexes into `cartas`. */
export type PrivateHandView = {
    matchId: string;
    version: number;
    playerId: string;
    cards: MatchCard[];
    groups: number[][];
};

/** Domain events that come with the public messages. */
export type MatchEventType =
    | 'MATCH_STARTED'
    | 'CARD_DRAWN'
    | 'TURN_CHANGED'
    | 'CLOSE_FAILED'
    | 'PLAYER_KNOCKED'
    | 'ROUND_CLOSED'
    | 'ROUND_STARTED'
    | 'MATCH_FINISHED';

/** Message of the public room `match:{id}`. */
export type PublicMatchMessage = {
    event: MatchEventType;
    roomId: string;
    playerId: string | null;
    detail: Record<string, unknown>;
    match: PublicMatchView;
};

/** Message of the private room `user:{id}`. */
export type PrivateHandMessage = {
    roomId: string;
    hand: PrivateHandView;
};
