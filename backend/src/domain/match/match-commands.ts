/**
 * Pure transitions of the Match aggregate (ADR-04, ADR-05).
 *
 * Every command receives the current state and returns a NEW state (it does not mutate the
 * input) together with the domain events that will be published after the commit. The
 * whole close validation, the settlement and the outcome are computed here, in memory,
 * before writing to the database (§2.4). The rule of the mode arrives through the
 * `GameRulePlugin` contract; this module knows no concrete plug-in.
 *
 * No function exceeds cyclomatic complexity 10 (FF-04).
 */
import {
	DealSettings,
	Outcome,
	DeclaredHand,
	OpponentHand,
	GameRulePlugin,
	CloseType,
} from '../../rules/contract/game-rule.plugin';
import { ExceptionMessagesConstants as M } from '../../shared/exceptions/exception-messages.constants';
import { Shuffler, toContractCard, createDeck } from './match-cards';
import {
	PotContribution,
	MatchCard,
	MatchSettings,
	ScoreboardEntry,
	TurnPhase,
	MatchPlayer,
	PlayerHand,
	DrawSource,
	Match,
	MatchRound,
} from './match';
import { MatchConflictException, InvalidMatchException } from './match.exceptions';

/** Types of the match domain events (published after the commit). */
export type MatchEventType =
	| 'MATCH_STARTED'
	| 'CARD_DRAWN'
	| 'TURN_CHANGED'
	| 'CLOSE_FAILED'
	| 'PLAYER_KNOCKED'
	| 'ROUND_CLOSED'
	| 'ROUND_STARTED'
	| 'MATCH_FINISHED';

/**
 * Domain event. `detail` only carries public information: never a player's hand nor
 * the content of the deck (R04).
 */
export interface MatchEvent {
	readonly type: MatchEventType;
	readonly playerId?: string;
	readonly detail: Readonly<Record<string, unknown>>;
}

/** Result of applying a command. */
export interface TransitionResult {
	readonly match: Match;
	readonly events: MatchEvent[];
	/** The match finished: the pot must be paid in the same transaction. */
	readonly finished: boolean;
}

/** Data to create the aggregate when the match starts. */
export interface NewMatchData {
	id: string;
	invitationCode: string;
	name: string;
	hostId: string;
	settings: MatchSettings;
	players: Array<Pick<MatchPlayer, 'playerId' | 'userId' | 'username' | 'position'>>;
	contributions: PotContribution[];
	now: Date;
}

/** Rule of the match and dependencies needed by a command that can close the round. */
export interface RuleContext {
	rule: GameRulePlugin;
	shuffler: Shuffler;
	now: Date;
}

/** Data of the close attempt. */
export interface CloseData {
	type: CloseType;
	/** Indexes of the current hand (11 cards) per group. */
	groups: unknown;
	/** Index of the card discarded when closing. */
	discard: number;
}

/** Maximum number of groups and of cards per group (`hands.groups` schema). */
const MAX_GROUPS = 4;
const MAX_CARDS_PER_GROUP = 4;

const clone = (match: Match): Match => structuredClone(match);

/** Players still in the game, sorted by position. */
export function activePlayers(match: Match): MatchPlayer[] {
	return match.players.filter((j) => j.status === 'ACTIVE').sort((a, b) => a.position - b.position);
}

/** Player of the match. */
function player(match: Match, playerId: string): MatchPlayer {
	const found = match.players.find((j) => j.playerId === playerId);
	if (!found) throw new InvalidMatchException(M.PLAYER_NOT_IN_MATCH);
	return found;
}

/** Hand of a player in the round. */
function handOf(round: MatchRound, playerId: string): PlayerHand {
	const hand = round.hands.find((m) => m.playerId === playerId);
	if (!hand) throw new InvalidMatchException(M.PLAYER_NOT_IN_MATCH);
	return hand;
}

/** Round statuses in which turn commands are accepted. */
const STATUSES_WITH_TURNS: ReadonlyArray<MatchRound['status']> = ['IN_TURNS', 'EXTRA_ROUND'];

/**
 * The current round accepts turn commands (normal turns or the extra round after a knock).
 * @throws {MatchConflictException} ROUND_ALREADY_CLOSED if the match or the round is already closed.
 */
export function roundInTurns(match: Match): MatchRound {
	const round = match.currentRound;
	if (match.status !== 'IN_PROGRESS' || !round || !STATUSES_WITH_TURNS.includes(round.status)) {
		throw new MatchConflictException(M.ROUND_ALREADY_CLOSED);
	}
	return round;
}

/**
 * The player holds the turn.
 * @throws {MatchConflictException} ROUND_ALREADY_CLOSED or NOT_YOUR_TURN.
 */
export function checkTurn(match: Match, playerId: string): MatchRound {
	const round = roundInTurns(match);
	if (round.turn.playerId !== playerId) throw new MatchConflictException(M.NOT_YOUR_TURN);
	return round;
}

function requirePhase(round: MatchRound, phase: TurnPhase): void {
	if (round.turn.phase !== phase) throw new InvalidMatchException(M.INVALID_TURN_PHASE);
}

function requireIndex(hand: PlayerHand, index: number): void {
	if (!Number.isInteger(index) || index < 0 || index >= hand.cards.length) {
		throw new InvalidMatchException(M.CARD_NOT_IN_HAND);
	}
}

/** A group is an array of 1 to 4 integer indexes inside the hand. */
function isWellFormedGroup(group: unknown, handSize: number): group is number[] {
	if (!Array.isArray(group) || group.length === 0 || group.length > MAX_CARDS_PER_GROUP) return false;
	return group.every((i) => Number.isInteger(i) && i >= 0 && i < handSize);
}

/**
 * Validates the organization sent by the client: up to 4 groups, valid indexes, no
 * repeated cards and none of the excluded cards (e.g. the discarded one).
 * @throws {InvalidMatchException} INVALID_GROUPS.
 */
export function validateGroups(groups: unknown, handSize: number, excluded: number[]): number[][] {
	if (!Array.isArray(groups) || groups.length > MAX_GROUPS) throw new InvalidMatchException(M.INVALID_GROUPS);
	if (!groups.every((g) => isWellFormedGroup(g, handSize))) throw new InvalidMatchException(M.INVALID_GROUPS);
	const indices = (groups as number[][]).flat();
	if (new Set(indices).size !== indices.length || indices.some((i) => excluded.includes(i))) {
		throw new InvalidMatchException(M.INVALID_GROUPS);
	}
	return (groups as number[][]).map((g) => [...g]);
}

/** Adjusts the group indexes after removing a card from the hand. */
export function reindexWithoutCard(groups: number[][], removed: number): number[][] {
	return groups
		.map((g) => g.filter((i) => i !== removed).map((i) => (i > removed ? i - 1 : i)))
		.filter((g) => g.length > 0);
}

/** Cards of the hand that are in no group and are not excluded. */
function leftovers(cards: MatchCard[], groups: number[][], excluded: number[]): MatchCard[] {
	const used = new Set([...groups.flat(), ...excluded]);
	return cards.filter((_, i) => !used.has(i));
}

/** Hand declared by the player trying to close, in the language of the contract. */
function declaredHand(cards: MatchCard[], groups: number[][], discarded: number): DeclaredHand {
	return {
		groups: groups.map((g) => g.map((i) => toContractCard(cards[i]))),
		leftovers: leftovers(cards, groups, [discarded]).map(toContractCard),
		discard: toContractCard(cards[discarded]),
	};
}

/** An opponent's hand as they had it organized: it defines their penalty (RD-24). */
function opponentHand(hand: PlayerHand): OpponentHand {
	return {
		playerId: hand.playerId,
		groups: hand.groups.map((g) => g.map((i) => toContractCard(hand.cards[i]))),
		leftovers: leftovers(hand.cards, hand.groups, []).map(toContractCard),
	};
}

/** Next active player after a position (circular). */
function nextActive(match: Match, position: number): MatchPlayer {
	const active = activePlayers(match);
	return active.find((j) => j.position > position) ?? active[0];
}

/** Active players in turn order starting with the one after a position, excluding it. */
function orderFrom(match: Match, position: number): MatchPlayer[] {
	const active = activePlayers(match);
	return [...active.filter((j) => j.position > position), ...active.filter((j) => j.position < position)];
}

/**
 * Deals a new round among the active players. Two decks are used from
 * `twoDeckPlayers` players (PS-08). The first player gets one more card and
 * starts by discarding or closing.
 */
export function dealRound(
	match: Match,
	num: number,
	startPosition: number,
	deal: DealSettings,
	shuffler: Shuffler,
): MatchRound {
	const active = activePlayers(match);
	const decks = active.length >= match.settings.parameters.twoDeckPlayers ? 2 : 1;
	const deck = shuffler.shuffle(createDeck(decks));
	const initial = active.find((j) => j.position === startPosition) ?? active[0];
	const hands: PlayerHand[] = active.map((j) => ({
		playerId: j.playerId,
		cards: deck.splice(0, j === initial ? deal.firstPlayerCards : deal.cardsPerPlayer),
		groups: [],
	}));
	return {
		number: num,
		status: 'IN_TURNS',
		startPosition: initial.position,
		turn: { playerId: initial.playerId, phase: 'HOLDING_11_CARDS', closeAttempted: false, number: 1 },
		deck: deck,
		discardPile: [],
		hands: hands,
		extraRound: null,
	};
}

/**
 * Creates the aggregate with the first round dealt.
 */
export function createMatch(data: NewMatchData, deal: DealSettings, shuffler: Shuffler): TransitionResult {
	const players: MatchPlayer[] = [...data.players]
		.sort((a, b) => a.position - b.position)
		.map((j) => ({ ...j, status: 'ACTIVE', score: 0, usedRebuy: false, connected: true, disconnectedSince: null }));
	const match: Match = {
		_id: data.id,
		invitationCode: data.invitationCode,
		name: data.name,
		status: 'IN_PROGRESS',
		hostId: data.hostId,
		settings: data.settings,
		players: players,
		pot: { total: data.contributions.reduce((s, a) => s + a.amount, 0), contributions: data.contributions },
		currentRound: null,
		scoreboard: [],
		winnerId: null,
		resultsWindowUntil: null,
		recentCommands: [],
		version: 0,
		createdAt: data.now,
		updatedAt: data.now,
		finishedAt: null,
	};
	match.currentRound = dealRound(match, 1, players[0].position, deal, shuffler);
	return { match: match, events: [{ type: 'MATCH_STARTED', detail: { roundNumber: 1 } }], finished: false };
}

function drawFromDiscard(round: MatchRound): { card: MatchCard; deckRefilled: boolean } {
	const card = round.discardPile.pop();
	if (!card) throw new InvalidMatchException(M.EMPTY_DISCARD_PILE);
	return { card: card, deckRefilled: false };
}

/** If the deck runs out the discard pile is reshuffled, keeping the top card. */
function drawFromDeck(round: MatchRound, shuffler: Shuffler): { card: MatchCard; deckRefilled: boolean } {
	let deckRefilled = false;
	if (round.deck.length === 0) {
		const top = round.discardPile.pop();
		round.deck = shuffler.shuffle(round.discardPile);
		round.discardPile = top ? [top] : [];
		deckRefilled = true;
	}
	const card = round.deck.shift();
	if (!card) throw new InvalidMatchException(M.EMPTY_DECK);
	return { card: card, deckRefilled: deckRefilled };
}

/**
 * Draw command: the player in turn takes a card from the deck or the discard pile.
 */
export function draw(current: Match, playerId: string, source: DrawSource, shuffler: Shuffler): TransitionResult {
	const match = clone(current);
	const round = checkTurn(match, playerId);
	requirePhase(round, 'AWAITING_DRAW');
	const { card: card, deckRefilled } = source === 'DISCARD_PILE' ? drawFromDiscard(round) : drawFromDeck(round, shuffler);
	handOf(round, playerId).cards.push(card);
	round.turn.phase = 'HOLDING_11_CARDS';
	return { match: match, events: [{ type: 'CARD_DRAWN', playerId: playerId, detail: { source: source, deckRefilled } }], finished: false };
}

/**
 * Discard command: the player leaves a card on the pile and the turn passes to the next one.
 * They can send their group organization (indexes of the current hand, without the discarded card).
 * In the extra round (after a knock), the last pending discard settles the round.
 */
export function discard(
	actual: Match,
	playerId: string,
	index: number,
	groups: unknown,
	context: RuleContext,
): TransitionResult {
	const match = clone(actual);
	const round = checkTurn(match, playerId);
	requirePhase(round, 'HOLDING_11_CARDS');
	const hand = handOf(round, playerId);
	requireIndex(hand, index);
	const organization = groups === undefined ? hand.groups.map((g) => g.filter((i) => i !== index)) : validateGroups(groups, hand.cards.length, [index]);
	const [card] = hand.cards.splice(index, 1);
	round.discardPile.push(card);
	hand.groups = reindexWithoutCard(organization, index);
	if (round.status === 'EXTRA_ROUND') return advanceExtraRound(match, round, playerId, card, context);
	const nextPlayer = nextActive(match, player(match, playerId).position);
	round.turn = { playerId: nextPlayer.playerId, phase: 'AWAITING_DRAW', closeAttempted: false, number: round.turn.number + 1 };
	return {
		match: match,
		events: [{ type: 'TURN_CHANGED', playerId: playerId, detail: { discard: { ...card }, nextPlayerId: nextPlayer.playerId } }],
		finished: false,
	};
}

/**
 * The close type is allowed by the rule and the round: knocking again is not allowed during the extra round.
 * @throws {InvalidMatchException} CLOSE_NOT_ALLOWED.
 */
function requireAllowedClose(rule: GameRulePlugin, round: MatchRound, type: CloseType): void {
	const knockInExtraRound = round.status === 'EXTRA_ROUND' && type === 'KNOCK';
	if (!rule.allowedCloses().includes(type) || knockInExtraRound) throw new InvalidMatchException(M.CLOSE_NOT_ALLOWED);
}

/**
 * Attempt-to-close command: validates with the rule, and if the close is valid it settles
 * the round and evaluates the outcome in memory, in the same computation (§2.4). A knock
 * opens the extra round: the others play one last turn and the round is settled at the end.
 */
export function attemptClose(actual: Match, playerId: string, data: CloseData, context: RuleContext): TransitionResult {
	const { rule: rule } = context;
	const match = clone(actual);
	const round = checkTurn(match, playerId);
	requirePhase(round, 'HOLDING_11_CARDS');
	if (round.turn.closeAttempted) throw new InvalidMatchException(M.CLOSE_ALREADY_ATTEMPTED);
	requireAllowedClose(rule, round, data.type);
	const hand = handOf(round, playerId);
	requireIndex(hand, data.discard);
	const groups = validateGroups(data.groups, hand.cards.length, [data.discard]);
	const result = rule.validateClose(declaredHand(hand.cards, groups, data.discard), data.type);
	const effect = rule.closeEffect(result, data.type);
	const closer = player(match, playerId);
	closer.score += effect.pointsAdjustment;
	if (effect.extraRound) return startExtraRound(match, round, { playerId, discard: data.discard, groups });
	if (!effect.endsRound) {
		round.turn.closeAttempted = true;
		const detail = { reason: result.reason ?? null, pointsAdjustment: effect.pointsAdjustment, score: closer.score };
		return { match: match, events: [{ type: 'CLOSE_FAILED', playerId: playerId, detail: detail }], finished: false };
	}
	hand.groups = groups;
	return closeRound(match, round, { playerId, discard: data.discard, type: data.type, adjustment: effect.pointsAdjustment }, context);
}

interface ValidClose {
	playerId: string;
	discard: number;
	type: CloseType;
	adjustment: number;
}

/** Who wins the round and with which close type. */
interface RoundWinner {
	playerId: string;
	type: CloseType;
}

/** Takes the discarded card out of the hand, leaves it on the pile and adjusts the groups. */
function discardOnClose(round: MatchRound, playerId: string, discard: number): MatchCard {
	const hand = handOf(round, playerId);
	const [card] = hand.cards.splice(discard, 1);
	round.discardPile.push(card);
	hand.groups = reindexWithoutCard(hand.groups, discard);
	return card;
}

/**
 * Valid knock: the knocker discards and the other active players, in turn order,
 * play one last turn (extra round) before the settlement.
 */
function startExtraRound(
	match: Match,
	round: MatchRound,
	knock: { playerId: string; discard: number; groups: number[][] },
): TransitionResult {
	handOf(round, knock.playerId).groups = knock.groups;
	const card = discardOnClose(round, knock.playerId, knock.discard);
	const pending = orderFrom(match, player(match, knock.playerId).position).map((j) => j.playerId);
	round.status = 'EXTRA_ROUND';
	round.extraRound = { knockerId: knock.playerId, pending };
	round.turn = { playerId: pending[0], phase: 'AWAITING_DRAW', closeAttempted: false, number: round.turn.number + 1 };
	return {
		match: match,
		events: [{ type: 'PLAYER_KNOCKED', playerId: knock.playerId, detail: { discard: { ...card }, pending: [...pending] } }],
		finished: false,
	};
}

/** A player finished their extra turn: it passes to the next pending player or, if none is left, the round is settled. */
function advanceExtraRound(
	match: Match,
	round: MatchRound,
	playerId: string,
	card: MatchCard,
	context: RuleContext,
): TransitionResult {
	const extra = round.extraRound;
	extra.pending = extra.pending.filter((id) => id !== playerId);
	const nextPlayerId = extra.pending[0] ?? null;
	const turn: MatchEvent = { type: 'TURN_CHANGED', playerId: playerId, detail: { discard: { ...card }, nextPlayerId } };
	if (nextPlayerId) {
		round.turn = { playerId: nextPlayerId, phase: 'AWAITING_DRAW', closeAttempted: false, number: round.turn.number + 1 };
		return { match: match, events: [turn], finished: false };
	}
	// End of the extra round: everyone (including the knocker, for their leftover) settles their organized hand.
	const participants = activePlayers(match);
	const { penalties: penalties } = context.rule.settleRound(participants.map((j) => opponentHand(handOf(round, j.playerId))));
	participants.forEach((j) => (j.score += penalties[j.playerId] ?? 0));
	return concludeRound(match, round, { playerId: extra.knockerId, type: 'KNOCK' }, { ...penalties }, context, [turn]);
}

/** 4-3-3 close: the closer discards and each opponent settles their organized hand. */
function closeRound(match: Match, round: MatchRound, closeAttempt: ValidClose, context: RuleContext): TransitionResult {
	const discard = discardOnClose(round, closeAttempt.playerId, closeAttempt.discard);
	const opponents = activePlayers(match).filter((j) => j.playerId !== closeAttempt.playerId);
	const { penalties: penalties } = context.rule.settleRound(opponents.map((j) => opponentHand(handOf(round, j.playerId))));
	opponents.forEach((j) => (j.score += penalties[j.playerId] ?? 0));
	const roundPoints = { ...penalties, [closeAttempt.playerId]: closeAttempt.adjustment };
	return concludeRound(match, round, { playerId: closeAttempt.playerId, type: closeAttempt.type }, roundPoints, context, [], discard);
}

/**
 * Evaluates the outcome with the rule, records the scoreboard (multi-round) and deals the
 * next round or finishes the match. All in the same in-memory computation.
 */
function concludeRound(
	match: Match,
	round: MatchRound,
	winner: RoundWinner,
	roundPoints: Record<string, number>,
	context: RuleContext,
	previousEvents: MatchEvent[],
	discard?: MatchCard,
): TransitionResult {
	const { rule: rule, shuffler: shuffler, now: now } = context;
	const participants = activePlayers(match);
	const outcome = rule.evaluateOutcome(Object.fromEntries(participants.map((j) => [j.playerId, j.score])), winner.playerId);
	// If the match ends in this round, the players who go out are left as LOSER (see `finish`).
	if (!outcome.finished) participants.filter((j) => outcome.eliminated.includes(j.playerId)).forEach((j) => (j.status = 'ELIMINATED'));
	if (rule.descriptor.multiRound) {
		match.scoreboard.push(scoreboardEntry(round.number, winner, participants, roundPoints, outcome.eliminated, now));
	}
	round.status = 'CLOSED';
	round.extraRound = null;
	const closeEvent: MatchEvent = {
		type: 'ROUND_CLOSED',
		playerId: winner.playerId,
		detail: {
			roundNumber: round.number,
			closeType: winner.type,
			discard: discard ? { ...discard } : null,
			roundPoints,
			eliminated: [...outcome.eliminated],
		},
	};
	const events = [...previousEvents, closeEvent];
	if (outcome.finished) return finish(match, outcome, winner.playerId, now, events);
	const nextPlayer = nextActive(match, round.startPosition);
	match.currentRound = dealRound(match, round.number + 1, nextPlayer.position, rule.dealSettings(), shuffler);
	return { match: match, events: [...events, { type: 'ROUND_STARTED', detail: { roundNumber: round.number + 1 } }], finished: false };
}

function scoreboardEntry(
	roundNumber: number,
	winner: RoundWinner,
	participants: MatchPlayer[],
	roundPoints: Record<string, number>,
	eliminated: ReadonlyArray<string>,
	now: Date,
): ScoreboardEntry {
	return {
		roundNumber,
		winnerId: winner.playerId,
		closeType: winner.type,
		closedAt: now,
		points: participants.map((j) => ({
			playerId: j.playerId,
			roundPoints: roundPoints[j.playerId] ?? 0,
			penalties: 0,
			cumulative: j.score,
			eliminated: eliminated.includes(j.playerId),
			rebought: false,
		})),
	};
}

/** The match ends: the winner is marked and the rest lose (eliminated players keep their status). */
function finish(match: Match, outcome: Outcome, closerId: string, now: Date, events: MatchEvent[]): TransitionResult {
	const winnerId = outcome.winnerId ?? closerId;
	match.players.forEach((j) => {
		j.status = j.playerId === winnerId ? 'WINNER' : j.status === 'ELIMINATED' ? 'ELIMINATED' : 'LOSER';
	});
	match.status = 'FINISHED';
	match.winnerId = winnerId;
	match.finishedAt = now;
	events.push({ type: 'MATCH_FINISHED', playerId: winnerId, detail: { winnerId, prize: match.pot.total } });
	return { match: match, events: events, finished: true };
}
