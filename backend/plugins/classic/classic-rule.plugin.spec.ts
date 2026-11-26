import { ContractCard, DeclaredHand, ContractSuit } from '../../src/rules/contract/game-rule.plugin';
import { ClassicRulePlugin } from './classic-rule.plugin';

const c = (value: number, suit: ContractSuit): ContractCard => ({ rank: value, suit: suit });

const HAND: DeclaredHand = {
	groups: [
		[c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE'), c(5, 'DIAMOND')],
		[c(1, 'SPADE'), c(2, 'SPADE'), c(3, 'SPADE')],
		[c(13, 'CLUB'), c(13, 'HEART'), c(13, 'SPADE')],
	],
	leftovers: [],
	discard: c(9, 'HEART'),
};

describe('ClassicRulePlugin', () => {
	const rule = new ClassicRulePlugin();

	it('has a single round', () => {
		expect(rule.descriptor.multiRound).toBe(false);
		expect(rule.allowedCloses()).toEqual(['WIN_4_3_3']);
	});

	it('does not allow knocking', () => {
		const knock: DeclaredHand = { ...HAND, groups: [HAND.groups[0].slice(0, 3), HAND.groups[1], HAND.groups[2]], leftovers: [c(2, 'HEART')] };
		expect(rule.validateClose(knock, 'KNOCK').valid).toBe(false);
	});

	it('does not allow leftover cards in the 4-3-3', () => {
		expect(rule.validateClose({ ...HAND, leftovers: [c(2, 'HEART')] }, 'WIN_4_3_3').valid).toBe(false);
	});

	it('has no scoreboard: the close adds no points and the round penalizes nobody', () => {
		expect(rule.closeEffect({ valid: true }).pointsAdjustment).toBe(0);
		expect(rule.closeEffect({ valid: false }).pointsAdjustment).toBe(0);
		expect(rule.settleRound([{ playerId: 'p2', groups: [[c(2, 'CLUB'), c(9, 'HEART'), c(4, 'SPADE')]], leftovers: [] }]))
			.toEqual({ penalties: { p2: 0 } });
	});

	it('whoever closes wins and the match ends in that round', () => {
		expect(rule.evaluateOutcome({ p1: 0, p2: 0, p3: 0 }, 'p1')).toEqual({
			finished: true,
			winnerId: 'p1',
			eliminated: ['p2', 'p3'],
		});
	});
});
