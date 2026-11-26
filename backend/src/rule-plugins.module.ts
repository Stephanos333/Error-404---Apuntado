import { Global, Module } from '@nestjs/common';
import { RuleRegistry } from './rules/registry/rule-registry';
import { ClassicRulePlugin } from '../plugins/classic';
import { ApuntadoParameters, ApuntadoRulePlugin } from '../plugins/apuntado';
import { MatchParameters } from './domain/match/match';
import { SYSTEM_PARAMETERS, DEFAULT_SYSTEM_PARAMETERS } from './application/match/system-parameters';

/**
 * Reads a number from an environment variable; returns `undefined` when it does not exist or is not numeric.
 * @param {string} [value] The value of the variable.
 * @returns {number | undefined} The number read.
 */
function readNumber(value?: string): number | undefined {
	if (value === undefined || value.trim() === '') return undefined;
	const num: number = Number(value);
	return Number.isFinite(num) ? num : undefined;
}

/**
 * System parameters (PS) frozen in every match (RD-36). The environment variables of the
 * prototype override the default values.
 * @param {NodeJS.ProcessEnv} env The environment variables.
 * @returns {MatchParameters} The parameters.
 */
export function readSystemParameters(env: NodeJS.ProcessEnv = process.env): MatchParameters {
	const bonus = readNumber(env.APP_BONUS_POINTS);
	return {
		...DEFAULT_SYSTEM_PARAMETERS,
		invalidClosePenalty: readNumber(env.APP_FALSE_WIN_PENALTY_POINTS) ?? DEFAULT_SYSTEM_PARAMETERS.invalidClosePenalty,
		// In the schema the bonus is negative (PS-04); the prototype variable is positive.
		closeBonus: bonus === undefined ? DEFAULT_SYSTEM_PARAMETERS.closeBonus : -Math.abs(bonus),
	};
}

/**
 * Parameters of the Apuntado plug-in derived from the system parameters, so that the
 * rule and the settings frozen in the match agree.
 * @param {MatchParameters} system The system parameters.
 * @returns {ApuntadoParameters} The plug-in parameters.
 */
function apuntadoParameters(system: MatchParameters): ApuntadoParameters {
	return {
		eliminationLimit: system.eliminationLimit,
		victoryLimit: system.negativeVictoryThreshold,
		knockThreshold: system.knockThreshold,
		closeBonus: Math.abs(system.closeBonus),
		falseClosePenalty: system.invalidClosePenalty,
	};
}

/**
 * Composition root of the microkernel (ADR-03).
 *
 * It is the only place of the backend that knows the concrete plug-ins. It registers them in
 * the `RuleRegistry`, which validates their contract on startup; if a plug-in is incompatible
 * the application does not start. The core (application services) only receives the registry.
 * To add a mode it is enough to create its package in `backend/plugins/<id>/` and
 * register it here; the orchestrator does not change.
 * @param {NodeJS.ProcessEnv} [env=process.env] The environment variables.
 * @returns {RuleRegistry} The registry with the enabled rules.
 */
export function createRuleRegistry(env: NodeJS.ProcessEnv = process.env): RuleRegistry {
	const registry: RuleRegistry = new RuleRegistry();
	// Apuntado is the default: it keeps the behavior of the games created before the MVP.
	registry.register(new ApuntadoRulePlugin(apuntadoParameters(readSystemParameters(env))), { isDefault: true });
	registry.register(new ClassicRulePlugin());
	return registry;
}

/**
 * Global module that provides the rule registry and the system parameters.
 * @class
 */
@Global()
@Module({
	providers: [
		{ provide: RuleRegistry, useFactory: () => createRuleRegistry() },
		{ provide: SYSTEM_PARAMETERS, useFactory: () => readSystemParameters() },
	],
	exports: [RuleRegistry, SYSTEM_PARAMETERS],
})
export class RulePluginsModule {}
