/** Common contract (Contract Interface) that the core defines and the plug-ins implement. */
export type CloseType = 'WIN_4_3_3' | 'KNOCK';
export interface ValidationResult { valid: boolean; reason?: string }
export interface GameRulePlugin {
	readonly id: string;
	allowedCloses(): CloseType[];
	validateClose(groups: string[][], type: CloseType): ValidationResult;
}
