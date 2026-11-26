/**
 * Match aggregate (ADR-04): consistency unit for the whole game state.
 *
 * These interfaces follow the shape of `docs/schemas/matches.schema.json`. The MongoDB
 * identifiers (`_id`, `userId`, `hostId`, `ledgerEntryId`) are handled as hexadecimal
 * strings in the domain; the application layer turns them into `ObjectId` when
 * persisting.
 *
 * `playerId` is the `userId` (UUID) of the user: that way the server identifies who acts
 * from the JWT without extra queries.
 */

/** Card ranks of the document schema. */
export const CARD_RANKS = ['ACE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'J', 'Q', 'K'] as const;
export type CardRank = (typeof CARD_RANKS)[number];

/** Suits of the document schema. */
export const CARD_SUITS = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES'] as const;
export type CardSuit = (typeof CARD_SUITS)[number];

/** Card embedded in the match. `deckNumber` is 1 or 2 (two decks). */
export interface MatchCard {
	rank: CardRank;
	suit: CardSuit;
	deckNumber: number;
}

export type MatchStatus = 'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS' | 'FINISHED' | 'CANCELLED';
export type MatchPlayerStatus = 'IN_LOBBY' | 'ACTIVE' | 'ELIMINATED' | 'WINNER' | 'LOSER';
export type RoundStatus = 'DEALING' | 'IN_TURNS' | 'EXTRA_ROUND' | 'SETTLING' | 'CLOSED';
export type TurnPhase = 'AWAITING_DRAW' | 'HOLDING_11_CARDS';
export type DrawSource = 'DECK' | 'DISCARD_PILE';

export interface MatchPlayer {
	playerId: string;
	userId: string;
	username: string;
	position: number;
	status: MatchPlayerStatus;
	score: number;
	usedRebuy: boolean;
	connected: boolean;
	disconnectedSince: Date | null;
}

export interface PotContribution {
	userId: string;
	type: 'BET' | 'REBUY';
	amount: number;
	ledgerEntryId: string;
}

export interface MatchPot {
	total: number;
	contributions: PotContribution[];
}

export interface MatchTurn {
	playerId: string;
	phase: TurnPhase;
	closeAttempted: boolean;
	number: number;
}

export interface PlayerHand {
	playerId: string;
	cards: MatchCard[];
	/** Player's organization: indexes of `cards` per group. It defines the settlement (RD-24). */
	groups: number[][];
}

/** Extra round after a knock: the other players play one last turn before the settlement. */
export interface ExtraRound {
	knockerId: string;
	/** Players who still have their extra turn, in order. */
	pending: string[];
}

export interface MatchRound {
	number: number;
	status: RoundStatus;
	startPosition: number;
	turn: MatchTurn;
	deck: MatchCard[];
	discardPile: MatchCard[];
	hands: PlayerHand[];
	extraRound: ExtraRound | null;
}

export interface RoundPoints {
	playerId: string;
	roundPoints: number;
	penalties: number;
	cumulative: number;
	eliminated: boolean;
	rebought: boolean;
}

export interface ScoreboardEntry {
	roundNumber: number;
	winnerId: string;
	closeType: 'WIN_4_3_3' | 'KNOCK';
	points: RoundPoints[];
	closedAt: Date;
}

/** Frozen copy of the system parameters when the match is created (RD-36). */
export interface MatchParameters {
	eliminationLimit: number;
	knockThreshold: number;
	invalidClosePenalty: number;
	closeBonus: number;
	negativeVictoryThreshold: number;
	jokerValue: number;
	jokersPerDeck: number;
	twoDeckPlayers: number;
	disconnectGraceSec: number;
	resultsWindowSec: number;
}

export interface MatchSettings {
	mode: string;
	plugin: { id: string; version: string };
	capacity: number;
	betPerPlayer: number;
	visibility: 'PUBLIC' | 'PRIVATE';
	runType: 'WITH_WRAP' | 'WITHOUT_WRAP';
	jokersEnabled: boolean;
	rebuyEnabled: boolean;
	negativeVictoryEnabled: boolean;
	parameters: MatchParameters;
}

export interface Match {
	_id: string;
	invitationCode: string;
	name: string;
	status: MatchStatus;
	hostId: string;
	settings: MatchSettings;
	players: MatchPlayer[];
	pot: MatchPot;
	currentRound: MatchRound | null;
	scoreboard: ScoreboardEntry[];
	winnerId: string | null;
	resultsWindowUntil: Date | null;
	/** commandId of the latest applied actions (idempotency, at most 20). */
	recentCommands: string[];
	/** Optimistic concurrency control. */
	version: number;
	createdAt: Date;
	updatedAt: Date;
	finishedAt: Date | null;
}

/** Number of recent commands kept for idempotency. */
export const MAX_RECENT_COMMANDS = 20;
