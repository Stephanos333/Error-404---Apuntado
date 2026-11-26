/**
 * Pure logic of the match table (no React, no network): card identity, translating cards
 * to indexes for the backend, meld checks, the close shape and versions.
 */
import {CardRank, CardSuit, CloseType, MatchCard} from '../../types/match.type.ts';
import {CloseIntent, CloseRequest, DiscardIntent, DiscardRequest, DrawIntent, DrawRequest} from '../../types/services/match.ts';

/** Unique key of a card in a hand (with two decks there are repeated cards). */
export const cardKey = (c: MatchCard): string => `${c.valor}-${c.palo}-${c.baraja}`;

/** Card equality. */
export const sameCard = (a: MatchCard, b: MatchCard): boolean => cardKey(a) === cardKey(b);

/**
 * Generates a UUID v4 `idComando`. Uses `crypto.randomUUID` when available (secure
 * contexts) and `crypto.getRandomValues` otherwise (also cryptographic).
 */
export function generateCommandId(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Translation error: the intent does not match the current hand. `code` is an alert code. */
export class InvalidIntentError extends Error {
    constructor(public readonly code: string) {
        super(code);
    }
}

/**
 * Index of a card in the hand.
 * @throws {InvalidIntentError} CARTA_NO_ESTA_EN_LA_MANO
 */
export function cardIndex(hand: MatchCard[], card: MatchCard): number {
    const i = hand.findIndex((c) => sameCard(c, card));
    if (i < 0) throw new InvalidIntentError('CARTA_NO_ESTA_EN_LA_MANO');
    return i;
}

/** Translates card groups into hand index groups. */
export const groupsToIndexes = (hand: MatchCard[], groups: MatchCard[][]): number[][] =>
    groups.filter((g) => g.length > 0).map((g) => g.map((c) => cardIndex(hand, c)));

/** Translates index groups (as the backend stores them) into card groups. */
export const indexesToGroups = (hand: MatchCard[], groups: number[][]): MatchCard[][] =>
    groups.map((g) => g.map((i) => hand[i]).filter((c): c is MatchCard => !!c)).filter((g) => g.length > 0);

/**
 * Hand organization after receiving a new hand. Without a local organization (first load
 * or a new round) the server's one is used; otherwise the local one is kept, minus the
 * cards that are no longer in the hand.
 */
export function reconcileGroups(local: MatchCard[][] | null, cards: MatchCard[], serverGroups: number[][]): MatchCard[][] {
    if (!local) return indexesToGroups(cards, serverGroups);
    const inHand = new Set(cards.map(cardKey));
    return local.map((g) => g.filter((c) => inHand.has(cardKey(c)))).filter((g) => g.length > 0);
}

/** Cards of the hand that are not in any group and are not the excluded card. */
export function leftoversOf(hand: MatchCard[], groups: MatchCard[][], excluded?: MatchCard): MatchCard[] {
    const used = new Set(groups.flat().map(cardKey));
    if (excluded) used.add(cardKey(excluded));
    return hand.filter((c) => !used.has(cardKey(c)));
}

/** `robar` body. */
export function drawBody(intent: DrawIntent, version: number, idComando: string): DrawRequest {
    return {origen: intent.source === 'DISCARD_PILE' ? 'DESCARTE' : 'MAZO', version, idComando};
}

/** `descartar` body: the card and the groups become indexes of the current hand. */
export function discardBody(hand: MatchCard[], intent: DiscardIntent, version: number, idComando: string): DiscardRequest {
    const carta = cardIndex(hand, intent.card);
    const grupos = intent.groups ? groupsToIndexes(hand, intent.groups) : undefined;
    if (grupos?.flat().includes(carta)) throw new InvalidIntentError('GRUPOS_INVALIDOS');
    return {carta, grupos, version, idComando};
}

/**
 * `cerrar` body. Checks that the declaration matches the hand: groups, discard and leftovers
 * must cover exactly the 11 cards, without repeats.
 * @throws {InvalidIntentError} GRUPOS_INVALIDOS
 */
export function closeBody(hand: MatchCard[], intent: CloseIntent, version: number, idComando: string): CloseRequest {
    const {groups, discard, leftovers} = intent.declaration;
    const declared = [...groups.flat(), discard, ...leftovers].map(cardKey);
    const matches = declared.length === hand.length && new Set(declared).size === hand.length && hand.every((c) => declared.includes(cardKey(c)));
    if (!matches) throw new InvalidIntentError('GRUPOS_INVALIDOS');
    return {tipo: intent.closeType, grupos: groupsToIndexes(hand, groups), descarte: cardIndex(hand, discard), version, idComando};
}

/**
 * Close shape from the group sizes (whether the melds are valid is up to the server):
 * 1 four + 2 threes with no leftovers is 4-3-3; 3 threes + 1 leftover is a knock (tocar).
 * `null` when the organization has neither shape.
 */
export function closeShape(groups: MatchCard[][], leftovers: MatchCard[]): CloseType | null {
    const sizes = groups.filter((g) => g.length > 0).map((g) => g.length).sort().join(',');
    if (sizes === '3,3,4' && leftovers.length === 0) return 'GANAR_4_3_3';
    if (sizes === '3,3,3' && leftovers.length === 1) return 'TOCAR';
    return null;
}

/** Points of each rank (same table as the backend: A, J, Q and K are worth 10). */
const CARD_POINTS: Record<CardRank, number> = {
    AS: 10, DOS: 2, TRES: 3, CUATRO: 4, CINCO: 5, SEIS: 6, SIETE: 7, OCHO: 8, NUEVE: 9, DIEZ: 10, J: 10, Q: 10, K: 10,
};

/** Sum of the cards' points (informative: the server decides). */
export const points = (cards: MatchCard[]): number => cards.reduce((s, c) => s + CARD_POINTS[c.valor], 0);

/** Numeric value of each rank for runs (A = 1 … K = 13). */
const RANK_VALUE: Record<CardRank, number> = {
    AS: 1, DOS: 2, TRES: 3, CUATRO: 4, CINCO: 5, SEIS: 6, SIETE: 7, OCHO: 8, NUEVE: 9, DIEZ: 10, J: 11, Q: 12, K: 13,
};

/** Kind of meld a group forms. */
export type MeldKind = 'SET' | 'RUN';

/**
 * Same rule as the backend evaluator (`EvaluadorManos`, `CON_VUELTA` policy), used only to
 * give feedback before closing:
 * - a set: same rank, at most two copies of the same card (two decks);
 * - a run: same suit, distinct consecutive ranks; it may wrap from K to A (Q-K-A, K-A-2).
 * Only groups of 3 or 4 cards count as melds (terna or cuarta).
 * @returns {MeldKind | null} The meld kind, or `null` when the group is not a meld.
 */
export function meldKind(group: MatchCard[]): MeldKind | null {
    if (group.length < 3 || group.length > 4) return null;
    const sameRank = group.every((c) => c.valor === group[0].valor);
    if (sameRank) {
        const copies = new Map<string, number>();
        group.forEach((c) => copies.set(c.palo, (copies.get(c.palo) ?? 0) + 1));
        return Math.max(...copies.values()) <= 2 ? 'SET' : null;
    }
    if (!group.every((c) => c.palo === group[0].palo)) return null;
    const values = [...new Set(group.map((c) => RANK_VALUE[c.valor]))].sort((a, b) => a - b);
    if (values.length !== group.length) return null;
    const gaps = values.filter((v, i) => i > 0 && v - values[i - 1] !== 1).length;
    const wrapsAround = values[0] + 13 - values[values.length - 1] === 1;
    return gaps === 0 || (gaps === 1 && wrapsAround) ? 'RUN' : null;
}

/** Sort orders for the loose cards (display only). */
export type HandSort = 'RANK' | 'SUIT';

const SUIT_ORDER: Record<CardSuit, number> = {PICAS: 0, CORAZONES: 1, TREBOLES: 2, DIAMANTES: 3};

/**
 * Sorts cards for display without touching the hand order the backend relies on.
 * @param {MatchCard[]} cards The cards.
 * @param {HandSort} by Rank first or suit first.
 */
export function sortCards(cards: MatchCard[], by: HandSort): MatchCard[] {
    return [...cards].sort((a, b) => {
        const rank = RANK_VALUE[a.valor] - RANK_VALUE[b.valor];
        const suit = SUIT_ORDER[a.palo] - SUIT_ORDER[b.palo];
        return by === 'RANK' ? rank || suit : suit || rank;
    });
}

/** Image code of each rank (`public/assets/images/card/<design>/<suit>-<rank>.png`). */
const RANK_IMAGE: Record<CardRank, string> = {
    AS: 'A', DOS: 'C2', TRES: 'C3', CUATRO: 'C4', CINCO: 'C5', SEIS: 'C6', SIETE: 'C7', OCHO: 'C8', NUEVE: 'C9', DIEZ: 'C10', J: 'J', Q: 'Q', K: 'K',
};

/** Image code of each suit. */
const SUIT_IMAGE: Record<CardSuit, string> = {TREBOLES: 'CLUB', DIAMANTES: 'DIAMOND', CORAZONES: 'HEART', PICAS: 'SPADE'};

/** Data for `CardComponent` from a match card. */
export const cardImage = (c: MatchCard): { suit: string; type: string } => ({suit: SUIT_IMAGE[c.palo], type: RANK_IMAGE[c.valor]});

/** Backend errors after which the local state is stale and must be fetched again. */
const ERRORS_THAT_REFRESH = new Set(['VERSION_DESACTUALIZADA', 'RONDA_YA_CERRADA', 'TURNO_NO_CORRESPONDE', 'FASE_DE_TURNO_INVALIDA']);

/** Whether `GET /api/partidas/actual` must be requested after the error. */
export const shouldRefresh = (code: string): boolean => ERRORS_THAT_REFRESH.has(code);

/**
 * Decides whether a received state (socket or response) replaces the current one: it never
 * goes back to an older version. A version jump means something was missed: fetch again.
 */
export function compareVersion(current: number | undefined, received: number): 'APPLY' | 'IGNORE' | 'REFRESH' {
    if (current === undefined || received === current + 1 || received === current) return 'APPLY';
    if (received < current) return 'IGNORE';
    return 'REFRESH';
}
