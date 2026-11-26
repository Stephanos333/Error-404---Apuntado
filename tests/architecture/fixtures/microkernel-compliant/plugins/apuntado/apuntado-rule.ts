import { GameRulePlugin, ValidationResult, CloseType } from '../../src/rules/contract/game-rule.plugin';
import { isFour, isThree } from '../../src/rules/evaluator/hand-evaluator';

/** Apuntado mode plug-in: 4-3-3 or knock (3 threes + leftover < 5), counting to 101. */
export class ApuntadoRule implements GameRulePlugin {
	readonly id = 'apuntado';
	allowedCloses(): CloseType[] {
		return ['WIN_4_3_3', 'KNOCK'];
	}
	validateClose(groups: string[][], type: CloseType): ValidationResult {
		if (type === 'KNOCK') return { valid: groups.slice(0, 3).every(isThree) };
		return { valid: isFour(groups[0]) && isThree(groups[1]) && isThree(groups[2]) };
	}
}
