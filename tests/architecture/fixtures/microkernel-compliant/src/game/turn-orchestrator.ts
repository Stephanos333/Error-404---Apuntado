import { GameRulePlugin, CloseType } from '../rules/contract/game-rule.plugin';

/** The core only knows the contract; it receives the rule from the plug-in registry. */
export class TurnOrchestrator {
	constructor(private readonly rule: GameRulePlugin) {}
	declareClose(groups: string[][], type: CloseType): boolean {
		return this.rule.validateClose(groups, type).valid;
	}
}
