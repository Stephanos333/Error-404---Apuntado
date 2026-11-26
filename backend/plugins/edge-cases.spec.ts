/**
 * Checklist 2 (Unit & Functional Testing, Richards & Ford ch. 24): edge cases of the
 * Deliverable 3 guide, checked on the plug-in contract.
 *
 *  A. Hand with 3 incomplete threes: the close is invalid (both modes).
 *  B. Apuntado, knocking with 3 threes and a leftover of EXACTLY 5 points: rejected (strict < 5).
 *  C. End of the match at exactly 101 cumulative points and victory at exactly -51.
 */
import { ContractCard, DeclaredHand, ContractSuit, GameRulePlugin } from '../src/rules/contract/game-rule.plugin';
import { ClassicRulePlugin } from './classic';
import { ApuntadoRulePlugin } from './apuntado';

const c = (value: number, suit: ContractSuit): ContractCard => ({ rank: value, suit: suit });

/** Three valid threes: three SEVENs, 2-3-4 run of hearts and three Ks. */
const VALID_THREES: ContractCard[][] = [
	[c(7, 'CLUB'), c(7, 'HEART'), c(7, 'SPADE')],
	[c(2, 'HEART'), c(3, 'HEART'), c(4, 'HEART')],
	[c(13, 'CLUB'), c(13, 'DIAMOND'), c(13, 'SPADE')],
];

const apuntado: GameRulePlugin = new ApuntadoRulePlugin();
const classic: GameRulePlugin = new ClassicRulePlugin();

describe('Edge case A: hand with 3 incomplete threes', () => {
	/** Each "three" only has 2 cards that meld and a third one that breaks the meld. */
	const incomplete: ContractCard[][] = [
		[c(7, 'CLUB'), c(7, 'HEART'), c(9, 'SPADE')],
		[c(2, 'HEART'), c(3, 'HEART'), c(5, 'HEART')],
		[c(13, 'CLUB'), c(12, 'DIAMOND'), c(1, 'SPADE')],
	];
	const knock: DeclaredHand = { groups: incomplete, leftovers: [c(2, 'CLUB')], discard: c(10, 'CLUB') };
	const fourAndThree: DeclaredHand = {
		groups: [[c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE'), c(6, 'DIAMOND')], incomplete[0], incomplete[1]],
		leftovers: [],
		discard: c(10, 'CLUB'),
	};

	it('Apuntado rejects knocking with 3 incomplete threes and reports the reason', () => {
		const result = apuntado.validateClose(knock, 'KNOCK');
		expect(result.valid).toBe(false);
		expect(result.reason).toMatch(/3 valid threes/);
	});

	it.each([['classic', classic], ['apuntado', apuntado]])('%s rejects a 4-3-3 with incomplete groups', (_, rule) => {
		expect(rule.validateClose(fourAndThree, 'WIN_4_3_3').valid).toBe(false);
	});

	it('groups of 2 cards do not count as threes either', () => {
		const ofTwo = { ...knock, groups: VALID_THREES.map((g) => g.slice(0, 2)) };
		expect(apuntado.validateClose(ofTwo, 'KNOCK').valid).toBe(false);
	});

	it('the invalid close does not end the round and applies the penalty of the mode', () => {
		const effect = apuntado.closeEffect(apuntado.validateClose(knock, 'KNOCK'), 'KNOCK');
		expect(effect).toEqual({ endsRound: false, extraRound: false, pointsAdjustment: 3 });
	});
});

describe('Edge case B: Apuntado, leftover of exactly 5 points', () => {
	const knockWith = (leftover: ContractCard): DeclaredHand => ({ groups: VALID_THREES, leftovers: [leftover], discard: c(10, 'CLUB') });

	it('rejects the 5-point leftover (the rule requires strictly less than 5)', () => {
		const result = apuntado.validateClose(knockWith(c(5, 'DIAMOND')), 'KNOCK');
		expect(result.valid).toBe(false);
		expect(result.reason).toMatch(/less than 5/);
	});

	it('accepts the 4-point leftover (valid lower boundary)', () => {
		expect(apuntado.validateClose(knockWith(c(4, 'DIAMOND')), 'KNOCK').valid).toBe(true);
	});

	it('rejects the A as a leftover (it is worth 10 points in the prototype table)', () => {
		expect(apuntado.validateClose(knockWith(c(1, 'DIAMOND')), 'KNOCK').valid).toBe(false);
	});
});

describe('Edge case C: end-of-match thresholds (101 and -51)', () => {
	it('100 points does not eliminate; exactly 101 does eliminate and ends the 2-player match', () => {
		expect(apuntado.evaluateOutcome({ p1: 0, p2: 100 }, 'p1')).toEqual({ finished: false, eliminated: [] });
		expect(apuntado.evaluateOutcome({ p1: 0, p2: 101 }, 'p1')).toEqual({ finished: true, winnerId: 'p1', eliminated: ['p2'] });
	});

	it('with 3 players, reaching 101 eliminates but the match goes on', () => {
		expect(apuntado.evaluateOutcome({ p1: 0, p2: 101, p3: 40 }, 'p1')).toEqual({ finished: false, eliminated: ['p2'] });
	});

	it('-50 does not win; exactly -51 wins the match', () => {
		expect(apuntado.evaluateOutcome({ p1: -50, p2: 10 }, 'p1')).toEqual({ finished: false, eliminated: [] });
		expect(apuntado.evaluateOutcome({ p1: -51, p2: 10 }, 'p1')).toEqual({ finished: true, winnerId: 'p1', eliminated: [] });
	});

	it('Classic uses no thresholds: it ends in the first round with any scoreboard', () => {
		expect(classic.evaluateOutcome({ p1: 0, p2: 0 }, 'p1')).toMatchObject({ finished: true, winnerId: 'p1' });
	});
});
