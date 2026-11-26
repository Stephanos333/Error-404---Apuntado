import { randomInt } from 'node:crypto';
import { ContractCard, ContractSuit } from '../../rules/contract/game-rule.plugin';
import { MatchCard, CARD_SUITS, CardSuit, CARD_RANKS } from './match';

/** Suit of the document schema -> suit of the rule contract. */
const CONTRACT_SUIT: Record<CardSuit, ContractSuit> = {
	CLUBS: 'CLUB',
	DIAMONDS: 'DIAMOND',
	HEARTS: 'HEART',
	SPADES: 'SPADE',
};

/**
 * Translates a match card into the rule contract (A = 1 ... K = 13).
 * @param {MatchCard} card The match card.
 * @returns {ContractCard} The card in the contract.
 */
export function toContractCard(card: MatchCard): ContractCard {
	return { rank: CARD_RANKS.indexOf(card.rank) + 1, suit: CONTRACT_SUIT[card.suit] };
}

/**
 * Creates an ordered deck of 52 cards per deck.
 * @param {number} decks Number of decks (1 or 2).
 * @returns {MatchCard[]} The unshuffled deck.
 */
export function createDeck(decks: number): MatchCard[] {
	return Array.from({ length: decks }, (_, b) => b + 1).flatMap((deckNumber) =>
		CARD_RANKS.flatMap((value) => CARD_SUITS.map((suit): MatchCard => ({ rank: value, suit: suit, deckNumber: deckNumber }))),
	);
}

/** Strategy to shuffle the deck (allows deterministic tests). */
export interface Shuffler {
	shuffle<T>(items: ReadonlyArray<T>): T[];
}

/** Injection token of the shuffler. */
export const SHUFFLER = 'SHUFFLER';

/**
 * Fisher-Yates shuffle with a cryptographically secure generator (ADR-03, R04):
 * the order of the deck cannot be predicted from the client.
 * @implements {Shuffler}
 */
export class SecureShuffler implements Shuffler {
	shuffle<T>(items: ReadonlyArray<T>): T[] {
		const copy = [...items];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = randomInt(i + 1);
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	}
}
