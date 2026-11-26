import { GameRulePlugin } from '../contract/game-rule.plugin';
import { PluginIncompatibleError, RuleRegistry, RuleNotRegisteredError, isCompatibleVersion } from './rule-registry';

/** Minimal stub of the contract: the registry knows no concrete plug-in. */
function stub(id: string, override: Partial<GameRulePlugin> = {}): GameRulePlugin {
	return {
		descriptor: { id, name: id, version: '1.0.0', contractVersion: '1.0.0', multiRound: false },
		dealSettings: () => ({ cardsPerPlayer: 10, firstPlayerCards: 11 }),
		allowedCloses: () => ['WIN_4_3_3'],
		validateClose: (hand) => ({ valid: hand.groups.length > 0 }),
		closeEffect: (r) => ({ endsRound: r.valid, extraRound: false, pointsAdjustment: 0 }),
		settleRound: () => ({ penalties: {} }),
		evaluateOutcome: () => ({ finished: false, eliminated: [] }),
		...override,
	};
}

describe('RuleRegistry', () => {
	it('returns the rule by id and uses the first one as the default', () => {
		const registry = new RuleRegistry();
		registry.register(stub('a'));
		registry.register(stub('b'));
		expect(registry.get('b').descriptor.id).toBe('b');
		expect(registry.get().descriptor.id).toBe('a');
		expect(registry.ids()).toEqual(['a', 'b']);
	});

	it('honors the rule marked as default', () => {
		const registry = new RuleRegistry();
		registry.register(stub('a'));
		registry.register(stub('b'), { isDefault: true });
		expect(registry.isDefault).toBe('b');
	});

	it('throws RuleNotRegisteredError for an unknown id', () => {
		const registry = new RuleRegistry();
		registry.register(stub('a'));
		expect(() => registry.get('x')).toThrow(RuleNotRegisteredError);
		expect(registry.exists('x')).toBe(false);
	});

	it('rejects a duplicated id', () => {
		const registry = new RuleRegistry();
		registry.register(stub('a'));
		expect(() => registry.register(stub('a'))).toThrow(PluginIncompatibleError);
	});

	it('rejects a different major version of the contract (fail fast)', () => {
		const incompatible = stub('v2', { descriptor: { ...stub('v2').descriptor, contractVersion: '2.0.0' } });
		expect(() => new RuleRegistry('1.0.0').register(incompatible)).toThrow(PluginIncompatibleError);
	});

	it('rejects a plug-in that lacks a contract operation', () => {
		const incompleteGroup = { ...stub('x'), settleRound: undefined } as unknown as GameRulePlugin;
		expect(() => new RuleRegistry().register(incompleteGroup)).toThrow(/settleRound/);
	});

	it('the smoke test rejects a plug-in that accepts an empty hand', () => {
		const permissive = stub('x', { validateClose: () => ({ valid: true }) });
		expect(() => new RuleRegistry().register(permissive)).toThrow(/empty hand/);
	});

	it('semver compatibility: same major and a minor not above the core one', () => {
		expect(isCompatibleVersion('1.0.0', '1.2.0')).toBe(true);
		expect(isCompatibleVersion('1.3.0', '1.2.0')).toBe(false);
		expect(isCompatibleVersion('2.0.0', '1.0.0')).toBe(false);
		expect(isCompatibleVersion('x', '1.0.0')).toBe(false);
	});
});
