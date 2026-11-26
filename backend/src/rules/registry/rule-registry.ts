/**
 * Registry of the rule plug-ins (`PluginRegistry`, ADR-03).
 *
 * It validates each plug-in when registering it (contract shape, semver compatibility and
 * a smoke test) and hands it to the core by id. The core only knows this registry and the
 * contract, never a concrete plug-in (FF-02). If a plug-in is incompatible the registry
 * throws an error and the application does not start (fail fast).
 */
import { CONTRACT_OPERATIONS, GameRulePlugin, CONTRACT_VERSION } from '../contract/game-rule.plugin';

/** Thrown when a rule that is not registered is requested. */
export class RuleNotRegisteredError extends Error {
	constructor(public readonly id: string | undefined) {
		super(`The rule "${id}" is not registered.`);
		this.name = 'RuleNotRegisteredError';
	}
}

/** Thrown when a plug-in does not meet the contract or its version is not compatible. */
export class PluginIncompatibleError extends Error {
	constructor(public readonly id: string | undefined, reason: string) {
		super(`The plug-in "${id}" is incompatible: ${reason}`);
		this.name = 'PluginIncompatibleError';
	}
}

/** Numeric parts of a `major.minor.patch` semver version. */
function versionParts(version: string): number[] | undefined {
	const matched = /^(\d+)\.(\d+)\.(\d+)/.exec(version ?? '');
	return matched ? matched.slice(1, 4).map(Number) : undefined;
}

/**
 * A plug-in is compatible if it uses the same major version of the contract and does not
 * require a minor version newer than the core one.
 */
export function isCompatibleVersion(versionPlugin: string, coreVersion: string = CONTRACT_VERSION): boolean {
	const plugin = versionParts(versionPlugin);
	const core = versionParts(coreVersion);
	if (!plugin || !core) return false;
	return plugin[0] === core[0] && plugin[1] <= core[1];
}

/** Registration options. */
export interface RegistryOptions {
	/** The rule is used when a match has no frozen rule (matches created before the MVP). */
	isDefault?: boolean;
}

/**
 * In-memory registry of the available rules.
 * @class
 */
export class RuleRegistry {
	private readonly rules = new Map<string, GameRulePlugin>();
	private defaultId?: string;

	/**
	 * @param {string} coreVersion Version of the contract offered by the core.
	 */
	constructor(private readonly coreVersion: string = CONTRACT_VERSION) {}

	/**
	 * Validates and registers a plug-in. The first registered rule is the default one,
	 * unless another one is explicitly marked.
	 * @throws {PluginIncompatibleError} When the plug-in does not meet the contract or already exists.
	 */
	register(plugin: GameRulePlugin, options: RegistryOptions = {}): void {
		const id = plugin?.descriptor?.id;
		this.validateShape(plugin, id);
		if (!isCompatibleVersion(plugin.descriptor.contractVersion, this.coreVersion)) {
			throw new PluginIncompatibleError(id, `contract ${plugin.descriptor.contractVersion}, core ${this.coreVersion}.`);
		}
		if (this.rules.has(id)) throw new PluginIncompatibleError(id, 'a plug-in with that id is already registered.');
		this.smokeTest(plugin, id);
		this.rules.set(id, plugin);
		if (options.isDefault || !this.defaultId) this.defaultId = id;
	}

	/**
	 * Returns the rule with the given id, or the default one when none is given.
	 * @throws {RuleNotRegisteredError} When it does not exist.
	 */
	get(id?: string): GameRulePlugin {
		const key = id ?? this.defaultId;
		const rule = this.rules.get(key);
		if (!rule) throw new RuleNotRegisteredError(key);
		return rule;
	}

	/** Determines whether a rule is registered with the id. */
	exists(id: string): boolean {
		return this.rules.has(id);
	}

	/** Id of the default rule. */
	get isDefault(): string | undefined {
		return this.defaultId;
	}

	/** Ids of the registered rules. */
	ids(): string[] {
		return [...this.rules.keys()];
	}

	/** The plug-in exposes the descriptor and every operation of the contract. */
	private validateShape(plugin: GameRulePlugin, id: string | undefined): void {
		if (!id) throw new PluginIncompatibleError(id, 'it has no descriptor with an id.');
		const missing = CONTRACT_OPERATIONS.filter((op) => typeof plugin[op] !== 'function');
		if (missing.length > 0) throw new PluginIncompatibleError(id, `missing operations: ${missing.join(', ')}.`);
	}

	/** Smoke test: positive deal, at least one close, and an empty hand never closes. */
	private smokeTest(plugin: GameRulePlugin, id: string): void {
		const { cardsPerPlayer: cardsPerPlayer, firstPlayerCards: firstPlayerCards } = plugin.dealSettings();
		if (!(cardsPerPlayer > 0 && firstPlayerCards >= cardsPerPlayer)) {
			throw new PluginIncompatibleError(id, 'the deal settings are not valid.');
		}
		const closes = plugin.allowedCloses();
		if (closes.length === 0) throw new PluginIncompatibleError(id, 'it declares no allowed closes.');
		const emptyHand = { groups: [], leftovers: [] };
		if (closes.some((type) => plugin.validateClose(emptyHand, type).valid)) {
			throw new PluginIncompatibleError(id, 'it accepts the close of an empty hand.');
		}
	}
}
