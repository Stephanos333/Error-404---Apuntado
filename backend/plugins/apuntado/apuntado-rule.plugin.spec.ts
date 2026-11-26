import { ContractCard, DeclaredHand, Scoreboard, ContractSuit, GameRulePlugin } from '../../src/rules/contract/game-rule.plugin';
import { ApuntadoRulePlugin } from './apuntado-rule.plugin';

const c = (value: number, suit: ContractSuit): ContractCard => ({ rank: value, suit: suit });

const THREES = [
	[c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE')],
	[c(1, 'SPADE'), c(2, 'SPADE'), c(3, 'SPADE')],
	[c(13, 'CLUB'), c(13, 'HEART'), c(13, 'SPADE')],
];

const knock = (leftover: ContractCard): DeclaredHand => ({ groups: THREES, leftovers: [leftover], discard: c(9, 'HEART') });

describe('ApuntadoRulePlugin', () => {
	// It is used through the contract, just like the core does.
	const rule: GameRulePlugin = new ApuntadoRulePlugin({ closeBonus: 10, falseClosePenalty: 3 });

	it('is multi-round and allows 4-3-3 and knock', () => {
		expect(rule.descriptor.multiRound).toBe(true);
		expect(rule.allowedCloses()).toEqual(['WIN_4_3_3', 'KNOCK']);
	});

	describe('knock: 3 threes + 1 leftover worth less than 5 points', () => {
		it('accepts a 4-point leftover', () => {
			expect(rule.validateClose(knock(c(4, 'DIAMOND')), 'KNOCK').valid).toBe(true);
		});

		it('rejects a leftover of 5 points or more', () => {
			expect(rule.validateClose(knock(c(5, 'DIAMOND')), 'KNOCK').valid).toBe(false);
			expect(rule.validateClose(knock(c(1, 'DIAMOND')), 'KNOCK').valid).toBe(false);
		});

		it('rejects when a three does not meld or more than one card is left over', () => {
			const broken: DeclaredHand = { ...knock(c(2, 'DIAMOND')), groups: [THREES[0], THREES[1], [c(13, 'CLUB'), c(12, 'HEART'), c(2, 'SPADE')]] };
			expect(rule.validateClose(broken, 'KNOCK').valid).toBe(false);
			expect(rule.validateClose({ ...knock(c(2, 'DIAMOND')), leftovers: [c(2, 'DIAMOND'), c(3, 'DIAMOND')] }, 'KNOCK').valid).toBe(false);
		});

		it('a valid knock gives the others an extra round without ending the round', () => {
			expect(rule.closeEffect({ valid: true }, 'KNOCK')).toEqual({ endsRound: false, extraRound: true, pointsAdjustment: 0 });
		});

		it('honors the configured threshold', () => {
			const strict = new ApuntadoRulePlugin({ knockThreshold: 3 });
			expect(strict.validateClose(knock(c(3, 'DIAMOND')), 'KNOCK').valid).toBe(false);
			expect(strict.validateClose(knock(c(2, 'DIAMOND')), 'KNOCK').valid).toBe(true);
		});
	});

	it('gives a bonus for a valid 4-3-3 and penalizes the false close', () => {
		expect(rule.closeEffect({ valid: true }, 'WIN_4_3_3').pointsAdjustment).toBe(-10);
		expect(rule.closeEffect({ valid: false }, 'WIN_4_3_3').pointsAdjustment).toBe(3);
	});

	it('penalizes each opponent with the points of their unmatched cards', () => {
		const { penalties: playerPenalties } = rule.settleRound([
			{ playerId: 'p2', groups: [THREES[0], [c(2, 'CLUB'), c(9, 'HEART'), c(4, 'SPADE')]], leftovers: [] },
			{ playerId: 'p3', groups: THREES, leftovers: [c(13, 'DIAMOND')] },
		]);
		expect(playerPenalties).toEqual({ p2: 15, p3: 10 });
	});

	describe('multi-round cumulative scoreboard', () => {
		/** Simulates several rounds accumulating penalties on the same scoreboard. */
		function playRounds(rounds: Array<Record<string, number>>): Scoreboard {
			return rounds.reduce<Record<string, number>>((scoreboard, penalties) => {
				Object.entries(penalties).forEach(([id, p]) => (scoreboard[id] = (scoreboard[id] ?? 0) + p));
				return scoreboard;
			}, {});
		}

		it('the match goes on while two or more players are below 101', () => {
			const scoreboard = playRounds([{ p1: 0, p2: 40, p3: 30 }, { p1: 0, p2: 50, p3: 20 }]);
			expect(rule.evaluateOutcome(scoreboard, 'p1')).toEqual({ finished: false, eliminated: [] });
		});

		it('eliminates whoever reaches 101 or more', () => {
			const scoreboard = playRounds([{ p1: 0, p2: 60, p3: 30 }, { p1: 0, p2: 41, p3: 20 }]);
			expect(scoreboard.p2).toBe(101);
			expect(rule.evaluateOutcome(scoreboard, 'p1')).toEqual({ finished: false, eliminated: ['p2'] });
		});

		it('ends when a single active player is left', () => {
			const scoreboard = playRounds([{ p1: 0, p2: 101, p3: 120 }]);
			expect(rule.evaluateOutcome(scoreboard, 'p1')).toEqual({ finished: true, winnerId: 'p1', eliminated: ['p2', 'p3'] });
		});

		it('whoever drops to -51 or less wins', () => {
			expect(rule.evaluateOutcome({ p1: -51, p2: 10, p3: 20 }, 'p1')).toEqual({ finished: true, winnerId: 'p1', eliminated: [] });
		});
	});
});
