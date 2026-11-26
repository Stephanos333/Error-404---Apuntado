import { ValidationResult, CloseType } from '../../src/rules/contract/game-rule.plugin';
import { isThree } from '../../src/rules/evaluator/hand-evaluator';
// Intentional VIOLATION: a plug-in depends on another plug-in.
import { ClassicRule } from '../classic/classic-rule';

export class ApuntadoRule extends ClassicRule {
	readonly id = 'apuntado';
	allowedCloses(): CloseType[] {
		return ['WIN_4_3_3', 'KNOCK'];
	}
	validateClose(groups: string[][], type: CloseType = 'WIN_4_3_3'): ValidationResult {
		if (type === 'KNOCK') return { valid: groups.slice(0, 3).every(isThree) };
		return super.validateClose(groups);
	}
}
