// Intentional VIOLATION: the core instantiates a concrete plug-in instead of using the contract.
import { ClassicRule } from '../../plugins/classic/classic-rule';

export class TurnOrchestrator {
	private readonly rule = new ClassicRule();
	declareClose(groups: string[][]): boolean {
		return this.rule.validateClose(groups).valid;
	}
}
