/**
 * Filtered views of the match (ADR-05, R04 anti-cheating).
 *
 * - PUBLIC view, for the `match:{id}` room: general state, size of each hand, top card
 *   of the discard pile, current turn and scoreboard. It never includes the cards of the
 *   hands nor the content of the deck.
 * - PRIVATE view, for the `user:{id}` room: only the hand of that player.
 */
import { MatchCard, MatchPlayerStatus, MatchStatus, RoundStatus, TurnPhase, Match } from './match';

export interface PublicPlayerView {
	playerId: string;
	username: string;
	position: number;
	status: MatchPlayerStatus;
	score: number;
	connected: boolean;
	/** Only the size of the hand, never its cards. */
	cardsInHand: number;
}

export interface PublicRoundView {
	number: number;
	status: RoundStatus;
	turn: { playerId: string; phase: TurnPhase; closeAttempted: boolean; number: number };
	/** Only the number of cards in the deck, never its content or order. */
	cardsInDeck: number;
	cardsInDiscardPile: number;
	topDiscard: MatchCard | null;
	/** Extra round in progress after a knock: who knocked and who still has a last turn. */
	extraRound: { knockerId: string; pending: string[] } | null;
}

export interface PublicMatchView {
	matchId: string;
	version: number;
	status: MatchStatus;
	mode: string;
	winnerId: string | null;
	pot: { total: number };
	players: PublicPlayerView[];
	round: PublicRoundView | null;
	scoreboard: Array<{ roundNumber: number; winnerId: string; closeType: string; points: Array<{ playerId: string; roundPoints: number; cumulative: number; eliminated: boolean }> }>;
}

export interface PrivateMatchView {
	matchId: string;
	version: number;
	playerId: string;
	cards: MatchCard[];
	groups: number[][];
}

const copyCard = (c: MatchCard): MatchCard => ({ rank: c.rank, suit: c.suit, deckNumber: c.deckNumber });

/**
 * Public view: any player of the room can receive it.
 * @param {Match} match The match.
 * @returns {PublicMatchView} The view without private cards.
 */
export function publicView(match: Match): PublicMatchView {
	const round = match.currentRound;
	const handSize = (playerId: string): number => round?.hands.find((m) => m.playerId === playerId)?.cards.length ?? 0;
	const top = round?.discardPile[round.discardPile.length - 1];
	return {
		matchId: match._id,
		version: match.version,
		status: match.status,
		mode: match.settings.mode,
		winnerId: match.winnerId,
		pot: { total: match.pot.total },
		players: match.players.map((j) => ({
			playerId: j.playerId,
			username: j.username,
			position: j.position,
			status: j.status,
			score: j.score,
			connected: j.connected,
			cardsInHand: handSize(j.playerId),
		})),
		round: round
			? {
				number: round.number,
				status: round.status,
				turn: { ...round.turn },
				cardsInDeck: round.deck.length,
				cardsInDiscardPile: round.discardPile.length,
				topDiscard: top ? copyCard(top) : null,
				extraRound: round.extraRound ? { knockerId: round.extraRound.knockerId, pending: [...round.extraRound.pending] } : null,
			}
			: null,
		scoreboard: match.scoreboard.map((e) => ({
			roundNumber: e.roundNumber,
			winnerId: e.winnerId,
			closeType: e.closeType,
			points: e.points.map((p) => ({ playerId: p.playerId, roundPoints: p.roundPoints, cumulative: p.cumulative, eliminated: p.eliminated })),
		})),
	};
}

/**
 * Private view: the hand of ONE player. Returns `null` if the player has no hand.
 * @param {Match} match The match.
 * @param {string} playerId The player who owns the hand.
 * @returns {PrivateMatchView | null} Their hand.
 */
export function privateView(match: Match, playerId: string): PrivateMatchView | null {
	const hand = match.currentRound?.hands.find((m) => m.playerId === playerId);
	if (!hand) return null;
	return {
		matchId: match._id,
		version: match.version,
		playerId: playerId,
		cards: hand.cards.map(copyCard),
		groups: hand.groups.map((g) => [...g]),
	};
}
