/**
 * `@apuntado/plugin-classic` plug-in (ADR-03): Classic 4-3-3 mode.
 *
 * - Atomic match of a single round.
 * - Only close: 1 four + 2 threes + 1 discard.
 * - No historical scoreboard: whoever closes wins the match and the others are out.
 *
 * It only depends on the contract and the hand evaluator (FF-02).
 */
import {
	ACCEPTED,
	DealSettings,
	RuleDescriptor,
	Outcome,
	CloseEffect,
	RoundSettlement,
	DeclaredHand,
	OpponentHand,
	Scoreboard,
	GameRulePlugin,
	ValidationResult,
	CloseType,
	rejection,
} from '../../src/rules/contract/game-rule.plugin';
import { HandEvaluator, IHandEvaluator } from '../../src/rules/evaluator/hand-evaluator';

/**
 * Rule of the Classic mode (in D1: `ClassicFourThreeRule`).
 * @implements {GameRulePlugin}
 */
export class ClassicRulePlugin implements GameRulePlugin {
	readonly descriptor: RuleDescriptor = {
		id: 'classic',
		name: 'Classic 4-3-3',
		version: '1.0.0',
		contractVersion: '1.0.0',
		multiRound: false,
	};

	/**
	 * @param {IHandEvaluator} evaluator Meld evaluator (by default, runs with wrap).
	 */
	constructor(private readonly evaluator: IHandEvaluator = new HandEvaluator()) {}

	dealSettings(): DealSettings {
		return { cardsPerPlayer: 10, firstPlayerCards: 11 };
	}

	allowedCloses(): ReadonlyArray<CloseType> {
		return ['WIN_4_3_3'];
	}

	validateClose(hand: DeclaredHand, type: CloseType): ValidationResult {
		if (!this.allowedCloses().includes(type)) return rejection('The Classic mode only allows the 4-3-3 close.');
		if (!hand.discard) return rejection('The close requires a discard card.');
		if (hand.leftovers.length > 0) return rejection('The 4-3-3 close does not allow leftover cards.');
		if (!this.evaluator.isFourAndTwoThrees(hand.groups)) return rejection('1 valid four and 2 valid threes are required.');
		return ACCEPTED;
	}

	/** A valid close ends the round; there are no points because there is no scoreboard. */
	closeEffect(result: ValidationResult): CloseEffect {
		return { endsRound: result.valid, extraRound: false, pointsAdjustment: 0 };
	}

	/** No historical scoreboard: the round generates no penalties. */
	settleRound(hands: ReadonlyArray<OpponentHand>): RoundSettlement {
		return { penalties: Object.fromEntries(hands.map((m) => [m.playerId, 0])) };
	}

	/** A single round: whoever closes wins and the match ends. */
	evaluateOutcome(scoreboard: Scoreboard, closerId: string): Outcome {
		return {
			finished: true,
			winnerId: closerId,
			eliminated: Object.keys(scoreboard).filter((id) => id !== closerId),
		};
	}
}
