/**
 * Persistence model owned by the `database/` layer (dependency inversion).
 *
 * The Mongoose schemas and the native collections are defined on these interfaces and
 * not on the domain types. That way `database/` imports no domain module and takes part
 * in no dependency cycle (FF-03). The `application/` layer translates between these
 * records and the domain.
 */
import { Types } from 'mongoose';

/**
 * Persisted record of a card (model inherited from the prototype, `Player` collection).
 */
export interface CardRecord {
	type: string;
	suit: string;
}

/**
 * Persisted record of a card design.
 */
export interface CardDesignRecord {
	cardDesignId: string;
	name: string;
	isDefault: boolean;
	isActive: boolean;
	isFree: boolean;
	price?: number;
}

/**
 * Persisted record of a game (waiting room).
 */
export interface GameRecord {
	gameId: string;
	creatorId: string;
	hostId: string;
	status: string;
	name: string;
	requiredPlayers: number;
	currentPlayers: number;
	betByPlayer: number;
	isPublic: boolean;
	wasInitiated: boolean;
	/** `_id` (hexadecimal) of the `matches` document created when the game starts. */
	matchId?: string;
	ruleId?: string;
}

/**
 * Persisted record of a player (room membership).
 */
export interface PlayerRecord {
	playerId: string;
	gameId: string;
	userId: string;
	status: string;
	isActive: boolean;
	triedToWin: boolean;
	trips1?: [CardRecord, CardRecord, CardRecord];
	trips2?: [CardRecord, CardRecord, CardRecord];
	quads?: [CardRecord, CardRecord, CardRecord, CardRecord];
	score?: number;
	position?: number;
	kicker?: CardRecord;
	cardsMap?: Map<string, number>;
}

/**
 * Persisted record of a user.
 */
export interface UserRecord {
	userId: string;
	password: string;
	status: string;
	username: string;
	icon: string;
	currentDesignId: string;
	currentDesignName: string;
	tokens: number;
	cardDesigns: Array<string>;
}

/**
 * Card embedded in the `matches` aggregate (`docs/schemas/matches.schema.json`).
 */
export interface MatchCardRecord {
	rank: string;
	suit: string;
	deckNumber: number;
}

/**
 * Document of the Match aggregate (ADR-04). It follows `docs/schemas/matches.schema.json`;
 * the MongoDB identifiers are `ObjectId`.
 */
export interface MatchRecord {
	_id: Types.ObjectId;
	invitationCode: string;
	name: string;
	status: string;
	hostId: Types.ObjectId;
	settings: {
		mode: string;
		plugin: { id: string; version: string };
		capacity: number;
		betPerPlayer: number;
		visibility: string;
		runType: string;
		jokersEnabled: boolean;
		rebuyEnabled: boolean;
		negativeVictoryEnabled: boolean;
		parameters: Record<string, number>;
	};
	players: Array<{
		playerId: string;
		userId: Types.ObjectId;
		username: string;
		position: number;
		status: string;
		score: number;
		usedRebuy: boolean;
		connected: boolean;
		disconnectedSince: Date | null;
	}>;
	pot: {
		total: number;
		contributions: Array<{ userId: Types.ObjectId; type: string; amount: number; ledgerEntryId: Types.ObjectId }>;
	};
	currentRound: {
		number: number;
		status: string;
		startPosition: number;
		turn: { playerId: string; phase: string; closeAttempted: boolean; number: number };
		deck: MatchCardRecord[];
		discardPile: MatchCardRecord[];
		hands: Array<{ playerId: string; cards: MatchCardRecord[]; groups: number[][] }>;
		extraRound: { knockerId: string; pending: string[] } | null;
	} | null;
	scoreboard: Array<{
		roundNumber: number;
		winnerId: string;
		closeType: string;
		points: Array<{
			playerId: string;
			roundPoints: number;
			penalties: number;
			cumulative: number;
			eliminated: boolean;
			rebought: boolean;
		}>;
		closedAt: Date;
	}>;
	winnerId: string | null;
	resultsWindowUntil: Date | null;
	recentCommands: string[];
	version: number;
	createdAt: Date;
	updatedAt: Date;
	finishedAt: Date | null;
}

/**
 * Entry of the `token_ledger` (append-only, ADR-04).
 * A positive `amount` is a credit and a negative one a debit. `reference` is unique (idempotency).
 */
export interface TokenLedgerEntryRecord {
	_id: Types.ObjectId;
	userId: Types.ObjectId;
	type: 'INITIAL_BALANCE' | 'BET' | 'REFUND' | 'POT_PRIZE' | 'REBUY' | 'DESIGN_PURCHASE' | 'TOP_UP';
	amount: number;
	reference: string;
	matchId: Types.ObjectId | null;
	createdAt: Date;
}
