import { ClassicRulePlugin } from '../../../plugins/classic';
import { ApuntadoRulePlugin } from '../../../plugins/apuntado';
import { GameRulePlugin } from '../../rules/contract/game-rule.plugin';
import { WINNING_CLOSE, WINNING_HAND, TEST_PARAMETERS, shufflerWithFirst, card } from '../../../test/utils/match.fixtures';
import { Shuffler } from './match-cards';
import { RuleContext, NewMatchData, createMatch, discard, attemptClose, draw, validateGroups } from './match-commands';
import { Match } from './match';
import { MatchConflictException, InvalidMatchException } from './match.exceptions';

const ID = '0000000000000000000000a1';
const shuffler = shufflerWithFirst(WINNING_HAND);

/**
 * 11 cards to knock: three SEVENs (0-2), ACE-TWO-THREE run of spades (3-5), three K (6-8),
 * a TWO of diamonds as a 2-point leftover (9) and a NINE of hearts to discard (10).
 */
const KNOCK_HAND = [
	card('SEVEN', 'CLUBS'),
	card('SEVEN', 'DIAMONDS'),
	card('SEVEN', 'HEARTS'),
	card('ACE', 'SPADES'),
	card('TWO', 'SPADES'),
	card('THREE', 'SPADES'),
	card('K', 'CLUBS'),
	card('K', 'HEARTS'),
	card('K', 'SPADES'),
	card('TWO', 'DIAMONDS'),
	card('NINE', 'HEARTS'),
];
const KNOCK_CLOSE = { type: 'KNOCK' as const, groups: [[0, 1, 2], [3, 4, 5], [6, 7, 8]], discard: 10 };

function newMatch(rule: GameRulePlugin, players = 2, withShuffler: Shuffler = shuffler): Match {
	const data: NewMatchData = {
		id: ID,
		invitationCode: 'K7P2QX',
		name: 'Test table',
		hostId: '000000000000000000000101',
		settings: {
			mode: rule.descriptor.id,
			plugin: { id: rule.descriptor.id, version: rule.descriptor.version },
			capacity: players,
			betPerPlayer: 20,
			visibility: 'PUBLIC',
			runType: 'WITH_WRAP',
			jokersEnabled: false,
			rebuyEnabled: false,
			negativeVictoryEnabled: rule.descriptor.multiRound,
			parameters: TEST_PARAMETERS,
		},
		players: Array.from({ length: players }, (_, i) => ({
			playerId: `j${i + 1}`,
			userId: `00000000000000000000010${i + 1}`,
			username: `player${i + 1}`,
			position: i + 1,
		})),
		contributions: [],
		now: new Date('2026-11-20T00:00:00Z'),
	};
	return createMatch(data, rule.dealSettings(), withShuffler).match;
}

const code = (fn: () => unknown): string => {
	try {
		fn();
	} catch (e) {
		return e.message;
	}
	return 'NO_ERROR';
};

describe('Match aggregate: pure commands', () => {
	const classic = new ClassicRulePlugin();
	const apuntado = new ApuntadoRulePlugin();
	const ctx = (rule: GameRulePlugin, withShuffler: Shuffler = shuffler): RuleContext => ({ rule: rule, shuffler: withShuffler, now: new Date() });

	it('deals 11 cards to the first player and 10 to the others, and gives the turn with 11 cards', () => {
		const match = newMatch(classic, 3);
		expect(match.currentRound.hands.map((m) => m.cards.length)).toEqual([11, 10, 10]);
		expect(match.currentRound.turn).toEqual({ playerId: 'j1', phase: 'HOLDING_11_CARDS', closeAttempted: false, number: 1 });
		expect(match.currentRound.deck).toHaveLength(52 - 31);
	});

	it('does not mutate the input state', () => {
		const match = newMatch(classic);
		const copy = structuredClone(match);
		discard(match, 'j1', 10, undefined, ctx(classic));
		expect(match).toEqual(copy);
	});

	it('discarding passes the turn and leaves the card on top of the pile', () => {
		const { match: nextMatch, events: emitted } = discard(newMatch(classic), 'j1', 10, [[0, 1, 2, 3]], ctx(classic));
		expect(nextMatch.currentRound.turn).toMatchObject({ playerId: 'j2', phase: 'AWAITING_DRAW', number: 2 });
		expect(nextMatch.currentRound.discardPile).toEqual([card('NINE', 'HEARTS')]);
		expect(nextMatch.currentRound.hands[0].groups).toEqual([[0, 1, 2, 3]]);
		expect(emitted[0].type).toBe('TURN_CHANGED');
	});

	it('drawing from the discard pile takes the top card; drawing twice is an invalid phase', () => {
		const afterState = discard(newMatch(classic), 'j1', 10, undefined, ctx(classic)).match;
		const { match: nextMatch } = draw(afterState, 'j2', 'DISCARD_PILE', shuffler);
		expect(nextMatch.currentRound.hands[1].cards).toHaveLength(11);
		expect(nextMatch.currentRound.discardPile).toHaveLength(0);
		expect(code(() => draw(nextMatch, 'j2', 'DECK', shuffler))).toBe('INVALID_TURN_PHASE');
	});

	it('a player out of turn gets NOT_YOUR_TURN', () => {
		const match = newMatch(classic);
		expect(() => attemptClose(match, 'j2', { type: 'WIN_4_3_3', ...WINNING_CLOSE }, ctx(classic))).toThrow(MatchConflictException);
		expect(code(() => discard(match, 'j2', 0, undefined, ctx(classic)))).toBe('NOT_YOUR_TURN');
	});

	it('Classic: a valid close settles and finishes the match in the same computation', () => {
		const result = attemptClose(newMatch(classic), 'j1', { type: 'WIN_4_3_3', ...WINNING_CLOSE }, ctx(classic));
		expect(result.finished).toBe(true);
		expect(result.match.status).toBe('FINISHED');
		expect(result.match.winnerId).toBe('j1');
		expect(result.match.players.map((j) => j.status)).toEqual(['WINNER', 'LOSER']);
		expect(result.match.scoreboard).toEqual([]);
		expect(result.events.map((e) => e.type)).toEqual(['ROUND_CLOSED', 'MATCH_FINISHED']);
		expect(code(() => discard(result.match, 'j1', 0, undefined, ctx(classic)))).toBe('ROUND_ALREADY_CLOSED');
	});

	it('Apuntado: a valid close gives the bonus, penalizes the opponent, records the scoreboard and deals round 2', () => {
		const result = attemptClose(newMatch(apuntado), 'j1', { type: 'WIN_4_3_3', ...WINNING_CLOSE }, ctx(apuntado));
		const [j1, j2] = result.match.players;
		expect(result.finished).toBe(false);
		expect(j1.score).toBe(-10);
		expect(j2.score).toBeGreaterThan(0);
		expect(result.match.scoreboard).toHaveLength(1);
		expect(result.match.currentRound).toMatchObject({ number: 2, startPosition: 2, turn: { playerId: 'j2' } });
	});

	it('an invalid close applies the penalty of the rule and does not allow retrying in the same turn', () => {
		const data = { type: 'WIN_4_3_3' as const, groups: [[0, 1, 2], [4, 5, 6], [7, 8, 9]], discard: 10 };
		const { match: nextMatch, events: emitted } = attemptClose(newMatch(apuntado), 'j1', data, ctx(apuntado));
		expect(emitted[0].type).toBe('CLOSE_FAILED');
		expect(nextMatch.players[0].score).toBe(3);
		expect(code(() => attemptClose(nextMatch, 'j1', data, ctx(apuntado)))).toBe('CLOSE_ALREADY_ATTEMPTED');
	});

	it('validates the group organization', () => {
		expect(() => validateGroups([[0, 0]], 11, [])).toThrow(InvalidMatchException);
		expect(() => validateGroups([[0, 11]], 11, [])).toThrow(InvalidMatchException);
		expect(() => validateGroups([[1], [2], [3], [4], [5]], 11, [])).toThrow(InvalidMatchException);
		expect(() => validateGroups([[10]], 11, [10])).toThrow(InvalidMatchException);
		expect(() => validateGroups('x', 11, [])).toThrow(InvalidMatchException);
		expect(validateGroups([[0, 1, 2]], 11, [10])).toEqual([[0, 1, 2]]);
	});

	describe('Apuntado: knock and extra round', () => {
		const knockShuffler = shufflerWithFirst(KNOCK_HAND);
		const context = ctx(apuntado, knockShuffler);

		it('Classic does not allow knocking', () => {
			expect(code(() => attemptClose(newMatch(classic, 3, knockShuffler), 'j1', KNOCK_CLOSE, ctx(classic, knockShuffler)))).toBe('CLOSE_NOT_ALLOWED');
		});

		it('a valid knock opens the extra round: the knocker discards and the others play in order', () => {
			const { match: nextMatch, events: emitted } = attemptClose(newMatch(apuntado, 3, knockShuffler), 'j1', KNOCK_CLOSE, context);
			expect(emitted.map((e) => e.type)).toEqual(['PLAYER_KNOCKED']);
			expect(nextMatch.currentRound).toMatchObject({
				status: 'EXTRA_ROUND',
				extraRound: { knockerId: 'j1', pending: ['j2', 'j3'] },
				turn: { playerId: 'j2', phase: 'AWAITING_DRAW' },
			});
			expect(nextMatch.currentRound.hands[0].cards).toHaveLength(10);
			expect(nextMatch.currentRound.discardPile).toEqual([card('NINE', 'HEARTS')]);
		});

		it('knocking again is not allowed during the extra round', () => {
			let match = attemptClose(newMatch(apuntado, 3, knockShuffler), 'j1', KNOCK_CLOSE, context).match;
			match = draw(match, 'j2', 'DECK', knockShuffler).match;
			expect(code(() => attemptClose(match, 'j2', KNOCK_CLOSE, context))).toBe('CLOSE_NOT_ALLOWED');
		});

		it('the last extra turn settles the round: the knocker adds their leftover and the others their loose cards', () => {
			let match = attemptClose(newMatch(apuntado, 3, knockShuffler), 'j1', KNOCK_CLOSE, context).match;
			match = draw(match, 'j2', 'DECK', knockShuffler).match;
			match = discard(match, 'j2', 0, undefined, context).match;
			expect(match.currentRound.extraRound.pending).toEqual(['j3']);
			match = draw(match, 'j3', 'DECK', knockShuffler).match;
			const final = discard(match, 'j3', 0, undefined, context);

			expect(final.events.map((e) => e.type)).toEqual(['TURN_CHANGED', 'ROUND_CLOSED', 'ROUND_STARTED']);
			const [entry] = final.match.scoreboard;
			expect(entry).toMatchObject({ roundNumber: 1, winnerId: 'j1', closeType: 'KNOCK' });
			expect(entry.points.find((p) => p.playerId === 'j1').roundPoints).toBe(2);
			expect(entry.points.filter((p) => p.playerId !== 'j1').every((p) => p.roundPoints > 0)).toBe(true);
			expect(final.match.currentRound).toMatchObject({ number: 2, status: 'IN_TURNS', extraRound: null });
		});

		it('knocking with a three that does not meld is rejected with a penalty and the round goes on normally', () => {
			// Group [7, 8, 9] = K, K, TWO: it does not meld; the close is invalid.
			const incompleteGroup = { ...KNOCK_CLOSE, groups: [[0, 1, 2], [3, 4, 5], [7, 8, 9]], discard: 10 };
			const { match: nextMatch, events: emitted } = attemptClose(newMatch(apuntado, 3, knockShuffler), 'j1', incompleteGroup, context);
			expect(emitted[0].type).toBe('CLOSE_FAILED');
			expect(nextMatch.currentRound.status).toBe('IN_TURNS');
		});
	});
});
