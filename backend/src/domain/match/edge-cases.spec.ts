/**
 * Checklist 2, edge case C on the whole aggregate: the match detects the end exactly
 * when the thresholds are crossed while closing a round (in-memory computation, §2.4).
 * It also covers edge case A end to end (penalty for an invalid close).
 */
import { ApuntadoRulePlugin } from '../../../plugins/apuntado';
import { WINNING_CLOSE, WINNING_HAND, TEST_PARAMETERS, shufflerWithFirst } from '../../../test/utils/match.fixtures';
import { TransitionResult, createMatch, attemptClose } from './match-commands';
import { Match } from './match';

const rule = new ApuntadoRulePlugin();
const shuffler = shufflerWithFirst(WINNING_HAND);

/** Two-player Apuntado match; j1 holds the winning hand and j2 did not organize theirs. */
function matchWith(scores: { j1: number; j2: number }): Match {
	const p = createMatch(
		{
			id: '0000000000000000000000a1',
			invitationCode: 'K7P2QX',
			name: 'Table',
			hostId: '000000000000000000000101',
			settings: {
				mode: 'apuntado',
				plugin: { id: 'apuntado', version: '1.0.0' },
				capacity: 2,
				betPerPlayer: 20,
				visibility: 'PUBLIC',
				runType: 'WITH_WRAP',
				jokersEnabled: false,
				rebuyEnabled: false,
				negativeVictoryEnabled: true,
				parameters: TEST_PARAMETERS,
			},
			players: [
				{ playerId: 'j1', userId: '000000000000000000000101', username: 'j1', position: 1 },
				{ playerId: 'j2', userId: '000000000000000000000102', username: 'j2', position: 2 },
			],
			contributions: [],
			now: new Date(),
		},
		rule.dealSettings(),
		shuffler,
	).match;
	p.players[0].score = scores.j1;
	p.players[1].score = scores.j2;
	return p;
}

const close = (p: Match): TransitionResult =>
	attemptClose(p, 'j1', { type: 'WIN_4_3_3', ...WINNING_CLOSE }, { rule: rule, shuffler: shuffler, now: new Date() });

/** Penalty j2 receives when j1 closes (their 10 unorganized cards). */
const opponentPenalty = close(matchWith({ j1: 0, j2: 0 })).match.players[1].score;

describe('Edge case C on the aggregate: end of the match at the exact threshold', () => {
	it("the opponent's penalty is positive (all their cards are left loose)", () => {
		expect(opponentPenalty).toBeGreaterThan(0);
	});

	it('if the opponent stays at 100 the match goes on with round 2', () => {
		const { match: after, finished: isFinished } = close(matchWith({ j1: 0, j2: 100 - opponentPenalty }));
		expect(isFinished).toBe(false);
		expect(after.players[1]).toMatchObject({ score: 100, status: 'ACTIVE' });
		expect(after.currentRound.number).toBe(2);
	});

	it('if the opponent reaches exactly 101 they are out and the match ends with a winner', () => {
		const { match: after, finished: isFinished, events: emitted } = close(matchWith({ j1: 0, j2: 101 - opponentPenalty }));
		expect(isFinished).toBe(true);
		expect(after.players[1].score).toBe(101);
		expect(after).toMatchObject({ status: 'FINISHED', winnerId: 'j1' });
		expect(after.scoreboard[0].points.find((p) => p.playerId === 'j2').eliminated).toBe(true);
		expect(emitted.map((e) => e.type)).toEqual(['ROUND_CLOSED', 'MATCH_FINISHED']);
	});

	it('if the closer drops to -50 the match goes on', () => {
		const { finished: isFinished, match: after } = close(matchWith({ j1: -40, j2: 0 }));
		expect(after.players[0].score).toBe(-50);
		expect(isFinished).toBe(false);
	});

	it('if the closer drops to exactly -51 they win the match', () => {
		const { finished: isFinished, match: after } = close(matchWith({ j1: -41, j2: 0 }));
		expect(after.players[0].score).toBe(-51);
		expect(isFinished).toBe(true);
		expect(after.winnerId).toBe('j1');
		expect(after.players.map((j) => j.status)).toEqual(['WINNER', 'LOSER']);
	});
});

describe('Edge case A on the aggregate: close with 3 incomplete threes', () => {
	it('it is rejected, the penalty is added and the round goes on in the same turn', () => {
		// Groups of 3 that do not meld: 5-5-ACE, 2-3-K and K-K-9.
		const data = { type: 'WIN_4_3_3' as const, groups: [[0, 1, 4], [5, 6, 7], [8, 9, 10]], discard: 3 };
		const { match: after, events: emitted, finished: isFinished } = attemptClose(matchWith({ j1: 0, j2: 0 }), 'j1', data, { rule: rule, shuffler: shuffler, now: new Date() });
		expect(isFinished).toBe(false);
		expect(emitted[0].type).toBe('CLOSE_FAILED');
		expect(after.players[0].score).toBe(3);
		expect(after.currentRound).toMatchObject({ number: 1, status: 'IN_TURNS', turn: { playerId: 'j1', closeAttempted: true } });
	});
});
