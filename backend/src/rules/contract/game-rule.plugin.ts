/**
 * `@apuntado/rule-contract` v1 contract (ADR-03).
 *
 * It is the only interface of the game rules the core knows. Each mode (Classic,
 * Apuntado, ...) is a plug-in in `backend/plugins/<id>/` that implements
 * `GameRulePlugin`. Every operation is pure: it receives data and returns decisions,
 * without side effects or framework dependencies (FF-05).
 *
 * The core knows none of the numbers of any mode (101, -51, 5, ...): it applies the
 * decisions the plug-in returns.
 */

/** Semver version of the contract offered by the core. */
export const CONTRACT_VERSION = '1.0.0';

/** Suits of the French deck. */
export type ContractSuit = 'CLUB' | 'DIAMOND' | 'HEART' | 'SPADE';

/** Valid suits, in dealing order. */
export const SUITS: readonly ContractSuit[] = ['CLUB', 'DIAMOND', 'HEART', 'SPADE'];

/**
 * Card in the language of the contract.
 * `rank` goes from 1 (A) to 13 (K): J = 11, Q = 12, K = 13.
 */
export interface ContractCard {
	readonly rank: number;
	readonly suit: ContractSuit;
}

/**
 * Close types of a round.
 * - `WIN_4_3_3`: 1 four + 2 threes + 1 discard.
 * - `KNOCK`: 3 threes + 1 low-value leftover + 1 discard.
 */
export type CloseType = 'WIN_4_3_3' | 'KNOCK';

/** Hand a player declares when trying to close the round. */
export interface DeclaredHand {
	/** Declared melds (threes or fours). */
	readonly groups: ReadonlyArray<ReadonlyArray<ContractCard>>;
	/** Cards that are not part of any meld (not counting the discard). */
	readonly leftovers: ReadonlyArray<ContractCard>;
	/** Card the player discards when closing. */
	readonly discard?: ContractCard;
}

/** Result of validating a close. */
export interface ValidationResult {
	readonly valid: boolean;
	/** Reason of the rejection, readable by the player. */
	readonly reason?: string;
}

/** Identification of the plug-in. */
export interface RuleDescriptor {
	/** Stable identifier; it is frozen in the match when it is created. */
	readonly id: string;
	readonly name: string;
	/** Semver version of the plug-in. */
	readonly version: string;
	/** Semver version of the contract the plug-in was compiled with. */
	readonly contractVersion: string;
	/** `true` if the match is played over several rounds with a cumulative scoreboard. */
	readonly multiRound: boolean;
}

/** How many cards each player receives when dealing. */
export interface DealSettings {
	readonly cardsPerPlayer: number;
	/** The player who opens the round gets one more card to be able to discard. */
	readonly firstPlayerCards: number;
}

/** Decision of the plug-in on a close attempt. */
export interface CloseEffect {
	/** The round ends and is settled. */
	readonly endsRound: boolean;
	/** The other players play one more turn before the settlement (e.g. after a knock). */
	readonly extraRound: boolean;
	/** Points added (or subtracted, if negative) to the player who tried to close. */
	readonly pointsAdjustment: number;
}

/** Hand of a player who did not close the round, as they had it organized. */
export interface OpponentHand {
	readonly playerId: string;
	readonly groups: ReadonlyArray<ReadonlyArray<ContractCard>>;
	readonly leftovers: ReadonlyArray<ContractCard>;
}

/** Penalties of a round: points added to each opponent. */
export interface RoundSettlement {
	readonly penalties: Readonly<Record<string, number>>;
}

/** Cumulative score per player (player id -> points). */
export type Scoreboard = Readonly<Record<string, number>>;

/** State of the match after settling a round. */
export interface Outcome {
	/** The match finished. */
	readonly finished: boolean;
	/** Winner of the match, if it finished. */
	readonly winnerId?: string;
	/** Players left out of the match. */
	readonly eliminated: ReadonlyArray<string>;
}

/**
 * Contract implemented by every game mode.
 */
export interface GameRulePlugin {
	readonly descriptor: RuleDescriptor;
	dealSettings(): DealSettings;
	allowedCloses(): ReadonlyArray<CloseType>;
	validateClose(hand: DeclaredHand, type: CloseType): ValidationResult;
	closeEffect(result: ValidationResult, closeType: CloseType): CloseEffect;
	settleRound(hands: ReadonlyArray<OpponentHand>): RoundSettlement;
	evaluateOutcome(scoreboard: Scoreboard, closerId: string): Outcome;
}

/** Names of the contract operations (the registry uses them to validate the shape). */
export const CONTRACT_OPERATIONS: ReadonlyArray<keyof GameRulePlugin> = [
	'dealSettings',
	'allowedCloses',
	'validateClose',
	'closeEffect',
	'settleRound',
	'evaluateOutcome',
];

/** Shortcut to build a rejection. */
export function rejection(reason: string): ValidationResult {
	return { valid: false, reason: reason };
}

/** Shortcut to build an acceptance. */
export const ACCEPTED: ValidationResult = { valid: true };
