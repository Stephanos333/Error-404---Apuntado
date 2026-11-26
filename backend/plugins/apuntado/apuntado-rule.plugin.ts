/**
 * `@apuntado/plugin-apuntado` plug-in (ADR-03): Apuntado to 101 mode.
 *
 * - Match of several rounds with a cumulative scoreboard.
 * - Closes: 4-3-3 (1 four + 2 threes + 1 discard) and knock (3 threes + 1 leftover worth
 *   less than 5 points + 1 discard). A knock gives the other players an extra round.
 * - At settlement, each opponent adds the points of their unmatched cards.
 * - A player is eliminated when reaching 101 points or more; whoever is left alone or
 *   drops to -51 points or less wins.
 *
 * The thresholds are parameters of the plug-in; the core does not know them. It only
 * depends on the contract and the hand evaluator (FF-02).
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

/** Numeric parameters of the mode (PS). */
export interface ApuntadoParameters {
	/** Score from which a player is eliminated. */
	readonly eliminationLimit: number;
	/** Score with which a player wins the match. */
	readonly victoryLimit: number;
	/** The knock leftover must be worth strictly less than this threshold. */
	readonly knockThreshold: number;
	/** Points subtracted from whoever closes with 4-3-3. */
	readonly closeBonus: number;
	/** Points added to whoever declares an invalid close. */
	readonly falseClosePenalty: number;
}

/** Default values of the mode. */
export const APUNTADO_PARAMETERS: ApuntadoParameters = {
	eliminationLimit: 101,
	victoryLimit: -51,
	knockThreshold: 5,
	closeBonus: 10,
	falseClosePenalty: 3,
};

/**
 * Rule of the Apuntado mode (in D1: `ApuntadoRule101`).
 * @implements {GameRulePlugin}
 */
export class ApuntadoRulePlugin implements GameRulePlugin {
	readonly descriptor: RuleDescriptor = {
		id: 'apuntado',
		name: 'Apuntado a 101',
		version: '1.0.0',
		contractVersion: '1.0.0',
		multiRound: true,
	};

	private readonly parameters: ApuntadoParameters;

	/**
	 * @param {Partial<ApuntadoParameters>} parameters Parameters that override the default values.
	 * @param {IHandEvaluator} evaluator Meld evaluator (by default, runs with wrap).
	 */
	constructor(
		parameters: Partial<ApuntadoParameters> = {},
		private readonly evaluator: IHandEvaluator = new HandEvaluator(),
	) {
		this.parameters = { ...APUNTADO_PARAMETERS, ...parameters };
	}

	dealSettings(): DealSettings {
		return { cardsPerPlayer: 10, firstPlayerCards: 11 };
	}

	allowedCloses(): ReadonlyArray<CloseType> {
		return ['WIN_4_3_3', 'KNOCK'];
	}

	validateClose(hand: DeclaredHand, type: CloseType): ValidationResult {
		if (!this.allowedCloses().includes(type)) return rejection(`Close not allowed: ${type}.`);
		if (!hand.discard) return rejection('The close requires a discard card.');
		return type === 'KNOCK' ? this.validateKnock(hand) : this.validateFourAndTwoThrees(hand);
	}

	/**
	 * Valid 4-3-3 close: ends the round and gives the bonus. Knock: extra round for the others.
	 * Invalid close: penalty and the round goes on.
	 */
	closeEffect(result: ValidationResult, type: CloseType): CloseEffect {
		if (!result.valid) return { endsRound: false, extraRound: false, pointsAdjustment: this.parameters.falseClosePenalty };
		if (type === 'KNOCK') return { endsRound: false, extraRound: true, pointsAdjustment: 0 };
		return { endsRound: true, extraRound: false, pointsAdjustment: -this.parameters.closeBonus };
	}

	/** Each opponent adds the points of the groups that do not meld and of their leftovers. */
	settleRound(hands: ReadonlyArray<OpponentHand>): RoundSettlement {
		return {
			penalties: Object.fromEntries(
				hands.map((m) => [m.playerId, this.evaluator.unmatchedPoints(m.groups, m.leftovers)]),
			),
		};
	}

	/** Eliminates whoever reaches the limit and ends the match if one player is left or someone reaches victory. */
	evaluateOutcome(scoreboard: Scoreboard): Outcome {
		const ids = Object.keys(scoreboard);
		const eliminated = ids.filter((id) => scoreboard[id] >= this.parameters.eliminationLimit);
		const active = ids.filter((id) => !eliminated.includes(id));
		const winnerByPoints = active.find((id) => scoreboard[id] <= this.parameters.victoryLimit);
		if (winnerByPoints) return { finished: true, winnerId: winnerByPoints, eliminated: eliminated };
		if (active.length <= 1) return { finished: true, winnerId: active[0], eliminated: eliminated };
		return { finished: false, eliminated: eliminated };
	}

	private validateFourAndTwoThrees(hand: DeclaredHand): ValidationResult {
		if (hand.leftovers.length > 0) return rejection('The 4-3-3 close does not allow leftover cards.');
		if (!this.evaluator.isFourAndTwoThrees(hand.groups)) return rejection('1 valid four and 2 valid threes are required.');
		return ACCEPTED;
	}

	private validateKnock(hand: DeclaredHand): ValidationResult {
		if (!this.evaluator.areThreeThrees(hand.groups)) return rejection('Knocking requires 3 valid threes.');
		if (hand.leftovers.length !== 1) return rejection('Knocking requires exactly one leftover card.');
		if (this.evaluator.points(hand.leftovers) >= this.parameters.knockThreshold) {
			return rejection(`The leftover must be worth less than ${this.parameters.knockThreshold} points.`);
		}
		return ACCEPTED;
	}
}
