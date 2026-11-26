/**
 * Parameterized contract suite (ADR-03, compliance).
 *
 * The same set of cases runs against every registered plug-in. It shows that Classic
 * and Apuntado meet the same `GameRulePlugin` contract and that the core can use them
 * through the `RuleRegistry` without knowing their concrete implementation.
 */
import { ContractCard, DeclaredHand, ContractSuit, GameRulePlugin } from '../src/rules/contract/game-rule.plugin';
import { RuleRegistry } from '../src/rules/registry/rule-registry';
import { ClassicRulePlugin } from './classic';
import { ApuntadoRulePlugin } from './apuntado';

const c = (value: number, suit: ContractSuit): ContractCard => ({ rank: value, suit: suit });

/** Valid 4-3-3: four of 5s, A-2-3 run of spades and three of Ks. */
const HAND_4_3_3: DeclaredHand = {
	groups: [
		[c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE'), c(5, 'DIAMOND')],
		[c(1, 'SPADE'), c(2, 'SPADE'), c(3, 'SPADE')],
		[c(13, 'CLUB'), c(13, 'HEART'), c(13, 'SPADE')],
	],
	leftovers: [],
	discard: c(9, 'HEART'),
};

/** 4-3-3 with a run that crosses K -> A -> 2 (with-wrap policy of the prototype). */
const HAND_WITH_WRAP: DeclaredHand = {
	...HAND_4_3_3,
	groups: [HAND_4_3_3.groups[0], [c(13, 'HEART'), c(1, 'HEART'), c(2, 'HEART')], HAND_4_3_3.groups[2]],
};

/** The second three does not meld. */
const INVALID_HAND: DeclaredHand = {
	...HAND_4_3_3,
	groups: [HAND_4_3_3.groups[0], [c(1, 'SPADE'), c(7, 'HEART'), c(3, 'SPADE')], HAND_4_3_3.groups[2]],
};

const PLUGINS: Array<[string, () => GameRulePlugin]> = [
	['classic', () => new ClassicRulePlugin()],
	['apuntado', () => new ApuntadoRulePlugin()],
];

describe.each(PLUGINS)('GameRulePlugin contract: %s', (id, create) => {
	let rule: GameRulePlugin;
	beforeEach(() => (rule = create()));

	it('exposes a descriptor with a stable id and a compatible contract version', () => {
		expect(rule.descriptor.id).toBe(id);
		expect(rule.descriptor.contractVersion).toMatch(/^1\.\d+\.\d+$/);
	});

	it('passes the validation and the smoke test of the registry', () => {
		const registry = new RuleRegistry();
		expect(() => registry.register(rule)).not.toThrow();
		expect(registry.get(id)).toBe(rule);
	});

	it('deals 10 cards and 11 to the opening player', () => {
		expect(rule.dealSettings()).toEqual({ cardsPerPlayer: 10, firstPlayerCards: 11 });
	});

	it('allows the 4-3-3 close', () => {
		expect(rule.allowedCloses()).toContain('WIN_4_3_3');
	});

	it('accepts 1 four + 2 threes + 1 discard, including the run with wrap', () => {
		expect(rule.validateClose(HAND_4_3_3, 'WIN_4_3_3').valid).toBe(true);
		expect(rule.validateClose(HAND_WITH_WRAP, 'WIN_4_3_3').valid).toBe(true);
	});

	it('rejects with a reason a hand whose melds are not valid', () => {
		const result = rule.validateClose(INVALID_HAND, 'WIN_4_3_3');
		expect(result.valid).toBe(false);
		expect(result.reason).toEqual(expect.any(String));
	});

	it('rejects a close without a discard', () => {
		expect(rule.validateClose({ ...HAND_4_3_3, discard: undefined }, 'WIN_4_3_3').valid).toBe(false);
	});

	it('a valid close ends the round; an invalid one does not', () => {
		expect(rule.closeEffect({ valid: true }, 'WIN_4_3_3').endsRound).toBe(true);
		expect(rule.closeEffect({ valid: false }, 'WIN_4_3_3').endsRound).toBe(false);
	});

	it('settles a non-negative penalty for each opponent', () => {
		const { penalties: playerPenalties } = rule.settleRound([
			{ playerId: 'p2', groups: INVALID_HAND.groups, leftovers: [] },
			{ playerId: 'p3', groups: HAND_4_3_3.groups, leftovers: [] },
		]);
		expect(Object.keys(playerPenalties).sort()).toEqual(['p2', 'p3']);
		Object.values(playerPenalties).forEach((p) => expect(p).toBeGreaterThanOrEqual(0));
	});

	it('the outcome only eliminates players of the scoreboard and never the winner', () => {
		const outcome = rule.evaluateOutcome({ p1: -10, p2: 40, p3: 120 }, 'p1');
		outcome.eliminated.forEach((e) => expect(['p1', 'p2', 'p3']).toContain(e));
		if (outcome.winnerId) expect(outcome.eliminated).not.toContain(outcome.winnerId);
	});
});
