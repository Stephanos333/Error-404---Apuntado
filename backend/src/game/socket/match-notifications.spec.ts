/**
 * Message contract test (ADR-05, R04): no message sent to the public room
 * `match:{id}` contains hands, the deck or the players' cards; each private room
 * `user:{id}` only receives its owner's hand.
 */
import { ApuntadoRulePlugin } from '../../../plugins/apuntado';
import { WINNING_CLOSE, WINNING_HAND, TEST_PARAMETERS, shufflerWithFirst } from '../../../test/utils/match.fixtures';
import { MatchEvent, createMatch, discard, attemptClose, draw } from '../../domain/match/match-commands';
import { Match } from '../../domain/match/match';
import { PrivateMatchMessage, planNotifications } from './match-notifications';
import { GameSocketConstants } from './game.socket.constants';

const FORBIDDEN_KEYS = ['hands', 'deck', 'cards', 'groups', 'cardsMap', 'trips1', 'trips2', 'quads', 'kicker', 'cardDeck'];

/** Keys of an object, in depth. */
function deepKeys(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(deepKeys);
	if (!value || typeof value !== 'object') return [];
	return Object.entries(value).flatMap(([k, v]) => [k, ...deepKeys(v)]);
}

const rule = new ApuntadoRulePlugin();
const shuffler = shufflerWithFirst(WINNING_HAND);

function scenario(): Array<{ match: Match; events: MatchEvent[] }> {
	const start = createMatch(
		{
			id: '0000000000000000000000a1',
			invitationCode: 'K7P2QX',
			name: 'Table',
			hostId: '000000000000000000000101',
			settings: {
				mode: 'apuntado',
				plugin: { id: 'apuntado', version: '1.0.0' },
				capacity: 3,
				betPerPlayer: 20,
				visibility: 'PUBLIC',
				runType: 'WITH_WRAP',
				jokersEnabled: false,
				rebuyEnabled: false,
				negativeVictoryEnabled: true,
				parameters: TEST_PARAMETERS,
			},
			players: ['u1', 'u2', 'u3'].map((id, i) => ({ playerId: id, userId: `00000000000000000000010${i}`, username: id, position: i + 1 })),
			contributions: [],
			now: new Date(),
		},
		rule.dealSettings(),
		shuffler,
	);
	const ctx = { rule: rule, shuffler: shuffler, now: new Date() };
	const discarded = discard(start.match, 'u1', 10, undefined, ctx);
	const drawn = draw(discarded.match, 'u2', 'DECK', shuffler);
	const failure = attemptClose(drawn.match, 'u2', { type: 'WIN_4_3_3', groups: [[1, 2, 3]], discard: 0 }, ctx);
	const otherHand = discard(failure.match, 'u2', 0, undefined, ctx);
	return [start, discarded, drawn, failure, otherHand];
}

describe('Match notifications: separation of public and private rooms', () => {
	const deliveries = scenario().flatMap(({ match: match, events }) => planNotifications('room-1', match, events));

	it('no message of the public room contains private cards or the deck', () => {
		const publicDeliveries = deliveries.filter((e) => e.room === 'match:room-1');
		expect(publicDeliveries.length).toBeGreaterThan(0);
		for (const delivery of publicDeliveries) {
			expect(deepKeys(delivery.content).filter((k) => FORBIDDEN_KEYS.includes(k))).toEqual([]);
		}
	});

	it('the public view only reports the size of each hand', () => {
		const start = deliveries.find((e) => e.message === GameSocketConstants.MATCH_STARTED_LISTENER);
		const players = (start.content as { match: { players: Array<{ cardsInHand: number }> } }).match.players;
		expect(players.map((j) => j.cardsInHand)).toEqual([11, 10, 10]);
	});

	it("SHIFT_CHANGED only carries the public view (it used to send the next player's hand)", () => {
		const turn = deliveries.filter((e) => e.message === GameSocketConstants.SHIFT_CHANGED_LISTENER);
		expect(turn.length).toBe(2);
		turn.forEach((e) => expect(e.room).toBe('match:room-1'));
	});

	it("each private room only receives its owner's hand", () => {
		const privateDeliveries = deliveries.filter((e) => e.room.startsWith('user:'));
		expect(privateDeliveries.length).toBeGreaterThan(0);
		for (const delivery of privateDeliveries) {
			expect(delivery.message).toBe(GameSocketConstants.PRIVATE_HAND_LISTENER);
			expect(`user:${(delivery.content as PrivateMatchMessage).hand.playerId}`).toBe(delivery.room);
		}
	});

	it('at the start, each player receives their hand through their private room', () => {
		const [start] = scenario();
		const privateDeliveries = planNotifications('room-1', start.match, start.events).filter((e) => e.room.startsWith('user:'));
		expect(privateDeliveries.map((e) => e.room).sort()).toEqual(['user:u1', 'user:u2', 'user:u3']);
	});

	it('private card messages are never sent to the public room', () => {
		expect(deliveries.filter((e) => e.message === GameSocketConstants.PRIVATE_HAND_LISTENER && !e.room.startsWith('user:'))).toEqual([]);
	});

	it("the round close is announced without revealing the opponents' hands", () => {
		const [start] = scenario();
		const closeAttempt = attemptClose(start.match, 'u1', { type: 'WIN_4_3_3', ...WINNING_CLOSE }, { rule: rule, shuffler: shuffler, now: new Date() });
		const publicDeliveries = planNotifications('room-1', closeAttempt.match, closeAttempt.events).filter((e) => e.room === 'match:room-1');
		expect(publicDeliveries.map((e) => e.message)).toEqual([GameSocketConstants.MATCH_WON_LISTENER, GameSocketConstants.ROUND_STARTED_LISTENER]);
		publicDeliveries.forEach((e) => expect(deepKeys(e.content).filter((k) => FORBIDDEN_KEYS.includes(k))).toEqual([]));
	});
});
