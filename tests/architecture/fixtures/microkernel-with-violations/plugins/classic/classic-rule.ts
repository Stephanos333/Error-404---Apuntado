import { GameRulePlugin, ValidationResult, CloseType } from '../../src/rules/contract/game-rule.plugin';
import { isFour, isThree } from '../../src/rules/evaluator/hand-evaluator';

/** Classic mode plug-in: 1 four + 2 threes + 1 discard, a single round. */
export class ClassicRule implements GameRulePlugin {
	readonly id = 'classic';
	allowedCloses(): CloseType[] {
		return ['WIN_4_3_3'];
	}
	validateClose(groups: string[][]): ValidationResult {
		return { valid: isFour(groups[0]) && isThree(groups[1]) && isThree(groups[2]) };
	}
}
