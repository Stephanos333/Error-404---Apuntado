/**
 * Test helpers of the Match aggregate (only imported from *.spec.ts / e2e files).
 */
import { Shuffler } from '../../src/domain/match/match-cards';
import { MatchCard, CardSuit, MatchParameters, CardRank } from '../../src/domain/match/match';

/** Shortcut to build a card of deck 1. */
export const card = (value: CardRank, suit: CardSuit, deckNumber = 1): MatchCard => ({ rank: value, suit: suit, deckNumber: deckNumber });

const isCard = (x: unknown): x is MatchCard => typeof x === 'object' && x !== null && 'rank' in x && 'suit' in x;

/**
 * Deterministic shuffler: puts the given cards first (in that order) and leaves the rest
 * of the deck in its natural order. Arrays that are not cards are not reordered.
 * @param {MatchCard[]} first The cards that must come out first.
 * @returns {Shuffler} The shuffler.
 */
export function shufflerWithFirst(first: MatchCard[]): Shuffler {
	return {
		shuffle<T>(items: ReadonlyArray<T>): T[] {
			if (!items.every(isCard)) return [...items];
			const rest = [...(items as unknown as MatchCard[])];
			const start = first.map((p) => {
				const i = rest.findIndex((c) => c.rank === p.rank && c.suit === p.suit && c.deckNumber === p.deckNumber);
				return rest.splice(i, 1)[0];
			});
			return [...start, ...rest] as unknown as T[];
		},
	};
}

/**
 * 11 cards that close 4-3-3: four of FIVEs (indexes 0-3), ACE-TWO-THREE run of
 * SPADES (4-6), three of Ks (7-9) and a NINE of HEARTS to discard (10).
 */
export const WINNING_HAND: MatchCard[] = [
	card('FIVE', 'CLUBS'),
	card('FIVE', 'DIAMONDS'),
	card('FIVE', 'HEARTS'),
	card('FIVE', 'SPADES'),
	card('ACE', 'SPADES'),
	card('TWO', 'SPADES'),
	card('THREE', 'SPADES'),
	card('K', 'CLUBS'),
	card('K', 'HEARTS'),
	card('K', 'SPADES'),
	card('NINE', 'HEARTS'),
];

/** Groups and discard index that close with `WINNING_HAND`. */
export const WINNING_CLOSE = { groups: [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9]], discard: 10 };

/** System parameters used in the tests. */
export const TEST_PARAMETERS: MatchParameters = {
	eliminationLimit: 101,
	knockThreshold: 5,
	invalidClosePenalty: 3,
	closeBonus: -10,
	negativeVictoryThreshold: -51,
	jokerValue: 0,
	jokersPerDeck: 0,
	twoDeckPlayers: 4,
	disconnectGraceSec: 120,
	resultsWindowSec: 20,
};
