/**
 * Shared `@apuntado/hand-evaluator` library (ADR-02, ADR-03).
 *
 * It replaces the `AllowedTrips` (260 entries) and `AllowedQuads` (299 entries) tables of
 * the prototype with a pure algorithmic validation. A meld is valid if it is:
 *  - a group of cards of the same rank, with at most 2 copies of the same card
 *    (up to two decks are played), or
 *  - a run: cards of the same suit with consecutive ranks. The run policy decides
 *    whether it can cross from K to A (`WITH_WRAP`, as in the prototype).
 *
 * Every function stays below cyclomatic complexity 10 (FF-04).
 */
import { ContractCard, SUITS } from '../contract/game-rule.plugin';

/**
 * Run policy (Strategy, ADR-02).
 * - `WITH_WRAP`: the run can cross K -> A -> 2 (Q-K-A, K-A-2, A-2-3...).
 * - `WITHOUT_WRAP`: the A can go before the 2 or after the K, but cannot cross.
 */
export type RunPolicy = 'WITH_WRAP' | 'WITHOUT_WRAP';

/** Number of distinct ranks of the deck (A..K). */
export const TOTAL_RANKS = 13;

/** Maximum copies of the same card (rank and suit) in a meld: two decks. */
export const MAX_COPIES_PER_CARD = 2;

/** Points of each rank (index = rank). Same table as the prototype: A, J, Q and K are worth 10. */
const POINTS_BY_RANK: readonly number[] = [0, 10, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];

/** Operations the plug-ins use to evaluate hands. */
export interface IHandEvaluator {
	isMeld(group: ReadonlyArray<ContractCard>): boolean;
	isThree(group: ReadonlyArray<ContractCard>): boolean;
	isFour(group: ReadonlyArray<ContractCard>): boolean;
	isFourAndTwoThrees(groups: ReadonlyArray<ReadonlyArray<ContractCard>>): boolean;
	areThreeThrees(groups: ReadonlyArray<ReadonlyArray<ContractCard>>): boolean;
	points(cards: ReadonlyArray<ContractCard>): number;
	unmatchedPoints(groups: ReadonlyArray<ReadonlyArray<ContractCard>>, leftovers: ReadonlyArray<ContractCard>): number;
}

/** Determines whether a card has a valid rank and suit. */
export function isValidCard(card: ContractCard): boolean {
	return Number.isInteger(card.rank) && card.rank >= 1 && card.rank <= TOTAL_RANKS && SUITS.includes(card.suit);
}

/** Points of a card according to the prototype table. */
export function cardPoints(card: ContractCard): number {
	return POINTS_BY_RANK[card.rank] ?? 0;
}

/** Highest number of times the same card (rank and suit) repeats in the group. */
function maxCopies(group: ReadonlyArray<ContractCard>): number {
	const counts = new Map<string, number>();
	for (const card of group) {
		const key = `${card.rank}-${card.suit}`;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return Math.max(0, ...counts.values());
}

/** Group of cards of the same rank (e.g. 7-7-7). */
export function isSameRankGroup(group: ReadonlyArray<ContractCard>): boolean {
	if (group.length === 0) return false;
	const value = group[0].rank;
	return group.every((c) => c.rank === value) && maxCopies(group) <= MAX_COPIES_PER_CARD;
}

/** Sorted ranks are consecutive without gaps. */
function isLinear(values: ReadonlyArray<number>): boolean {
	return values.every((v, i) => i === 0 || v - values[i - 1] === 1);
}

/** Number of gaps (differences other than 1) between sorted ranks. */
function gaps(values: ReadonlyArray<number>): number {
	return values.filter((v, i) => i > 0 && v - values[i - 1] !== 1).length;
}

/** Run that can cross K -> A: the ranks are consecutive on a circle of 13. */
function isCircularSequence(values: ReadonlyArray<number>): boolean {
	const wrapsAround = values[0] + TOTAL_RANKS - values[values.length - 1] === 1;
	return isLinear(values) || (gaps(values) === 1 && wrapsAround);
}

/** Run without wrap: the A is worth 1 or 14, but the run does not cross from K to 2. */
function isSequenceWithoutWrap(values: ReadonlyArray<number>): boolean {
	const withHighAce = values.map((v) => (v === 1 ? TOTAL_RANKS + 1 : v)).sort((a, b) => a - b);
	return isLinear(values) || isLinear(withHighAce);
}

/** Run: same suit, distinct ranks, consecutive according to the policy. */
export function isRun(group: ReadonlyArray<ContractCard>, policy: RunPolicy = 'WITH_WRAP'): boolean {
	if (group.length === 0 || !group.every((c) => c.suit === group[0].suit)) return false;
	const values = [...new Set(group.map((c) => c.rank))].sort((a, b) => a - b);
	if (values.length !== group.length) return false;
	return policy === 'WITH_WRAP' ? isCircularSequence(values) : isSequenceWithoutWrap(values);
}

/**
 * Hand evaluator configurable with a run policy.
 * @implements {IHandEvaluator}
 */
export class HandEvaluator implements IHandEvaluator {
	/**
	 * @param {RunPolicy} runPolicy Whether runs can cross from K to A.
	 */
	constructor(private readonly runPolicy: RunPolicy = 'WITH_WRAP') {}

	/** Rank group or run, with valid cards. */
	isMeld(group: ReadonlyArray<ContractCard>): boolean {
		if (!group.every(isValidCard)) return false;
		return isSameRankGroup(group) || isRun(group, this.runPolicy);
	}

	/** Meld of exactly 3 cards. */
	isThree(group: ReadonlyArray<ContractCard>): boolean {
		return group.length === 3 && this.isMeld(group);
	}

	/** Meld of exactly 4 cards. */
	isFour(group: ReadonlyArray<ContractCard>): boolean {
		return group.length === 4 && this.isMeld(group);
	}

	/** Exactly 3 groups: 1 four and 2 valid threes, in any order. */
	isFourAndTwoThrees(groups: ReadonlyArray<ReadonlyArray<ContractCard>>): boolean {
		if (groups.length !== 3) return false;
		const fours = groups.filter((g) => this.isFour(g)).length;
		const threes = groups.filter((g) => this.isThree(g)).length;
		return fours === 1 && threes === 2;
	}

	/** Exactly 3 groups and all of them are valid threes. */
	areThreeThrees(groups: ReadonlyArray<ReadonlyArray<ContractCard>>): boolean {
		return groups.length === 3 && groups.every((g) => this.isThree(g));
	}

	/** Sum of the points of the cards. */
	points(cards: ReadonlyArray<ContractCard>): number {
		return cards.reduce((sum, card) => sum + cardPoints(card), 0);
	}

	/** Points of the groups that are not valid melds plus those of the leftovers. */
	unmatchedPoints(groups: ReadonlyArray<ReadonlyArray<ContractCard>>, leftovers: ReadonlyArray<ContractCard>): number {
		const inInvalidGroups = groups.filter((g) => !this.isMeld(g)).reduce((s, g) => s + this.points(g), 0);
		return inInvalidGroups + this.points(leftovers);
	}
}
