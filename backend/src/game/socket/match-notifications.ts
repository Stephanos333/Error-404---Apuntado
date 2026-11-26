/**
 * Real-time notification plan of the match (ADR-05, R04 anti-cheating).
 *
 * Pure function: from the confirmed state and the events of the command it decides which
 * message goes to which room. The public room `match:{id}` only gets the public view
 * (size of each hand, top of the pile, turn, who closed). Each private room
 * `user:{id}` only gets that user's hand.
 */
import { Match } from '../../domain/match/match';
import { MatchEvent, MatchEventType } from '../../domain/match/match-commands';
import { PrivateMatchView, PublicMatchView, privateView, publicView } from '../../domain/match/match-views';
import { GameSocketConstants } from './game.socket.constants';
import { privateRoom, publicRoom } from './rooms';

/** Public message of a match event. */
export interface PublicMatchMessage {
	event: MatchEventType;
	roomId: string;
	playerId: string | null;
	detail: Readonly<Record<string, unknown>>;
	match: PublicMatchView;
}

/** Private message with a player's hand. */
export interface PrivateMatchMessage {
	roomId: string;
	hand: PrivateMatchView;
}

/** A planned delivery: room, message name and content. */
export interface Delivery {
	room: string;
	message: GameSocketConstants;
	content: PublicMatchMessage | PrivateMatchMessage;
}

/** Public message that matches each domain event. */
function publicMessage(event: MatchEvent): GameSocketConstants {
	const byType: Record<MatchEventType, GameSocketConstants> = {
		MATCH_STARTED: GameSocketConstants.MATCH_STARTED_LISTENER,
		CARD_DRAWN: GameSocketConstants.CARD_PULLED_FROM_DECK_LISTENER,
		TURN_CHANGED: GameSocketConstants.SHIFT_CHANGED_LISTENER,
		CLOSE_FAILED: GameSocketConstants.PLAYER_CANT_WIN_LISTENER,
		PLAYER_KNOCKED: GameSocketConstants.PLAYER_KNOCKED_LISTENER,
		ROUND_CLOSED: GameSocketConstants.MATCH_WON_LISTENER,
		ROUND_STARTED: GameSocketConstants.ROUND_STARTED_LISTENER,
		MATCH_FINISHED: GameSocketConstants.GAME_FINISHED_LISTENER,
	};
	if (event.type !== 'CARD_DRAWN') return byType[event.type];
	if (event.detail.source === 'DISCARD_PILE') return GameSocketConstants.CARD_PULLED_FROM_DISCARDED_LISTENER;
	return event.detail.deckRefilled ? GameSocketConstants.CARD_DECK_FILLED_LISTENER : byType.CARD_DRAWN;
}

/** Players whose hand changed with the event and must receive it through their private room. */
function affectedHands(event: MatchEvent, match: Match): string[] {
	const all = match.currentRound?.hands.map((m) => m.playerId) ?? [];
	if (event.type === 'MATCH_STARTED' || event.type === 'ROUND_STARTED') return all;
	const changesHand: ReadonlyArray<MatchEventType> = ['CARD_DRAWN', 'TURN_CHANGED', 'PLAYER_KNOCKED'];
	return event.playerId && changesHand.includes(event.type) ? [event.playerId] : [];
}

/**
 * Plans the deliveries of a confirmed command.
 * @param {string} roomId The id of the game (room).
 * @param {Match} match The confirmed state.
 * @param {ReadonlyArray<MatchEvent>} events The events of the command, in order.
 * @returns {Delivery[]} The deliveries: first the public ones, then the private hands.
 */
export function planNotifications(roomId: string, match: Match, events: ReadonlyArray<MatchEvent>): Delivery[] {
	const publicState = publicView(match);
	const publicDeliveries: Delivery[] = events.map((event) => ({
		room: publicRoom(roomId),
		message: publicMessage(event),
		content: { event: event.type, roomId: roomId, playerId: event.playerId ?? null, detail: event.detail, match: publicState },
	}));
	const recipients = [...new Set(events.flatMap((e) => affectedHands(e, match)))];
	const privateDeliveries: Delivery[] = recipients
		.map((playerId) => ({ playerId: playerId, hand: privateView(match, playerId) }))
		.filter((p) => p.hand !== null)
		.map((p) => ({ room: privateRoom(p.playerId), message: GameSocketConstants.PRIVATE_HAND_LISTENER, content: { roomId: roomId, hand: p.hand } }));
	return [...publicDeliveries, ...privateDeliveries];
}
