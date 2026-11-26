import { MatchParameters } from '../../domain/match/match';

/** Injection token of the system parameters (PS) that are frozen in every match. */
export const SYSTEM_PARAMETERS = 'SYSTEM_PARAMETERS';

/**
 * Default values of the system parameters (PS-01 to PS-10). The composition root
 * combines them with the environment variables and also hands them to the Apuntado
 * plug-in, so that the frozen settings and the rule match.
 */
export const DEFAULT_SYSTEM_PARAMETERS: MatchParameters = {
	eliminationLimit: 101,
	knockThreshold: 5,
	invalidClosePenalty: 3,
	closeBonus: -10,
	negativeVictoryThreshold: -51,
	jokerValue: 0,
	jokersPerDeck: 0,
	twoDeckPlayers: 4,
	disconnectGraceSec: 120,
	resultsWindowSec: 20,
};
