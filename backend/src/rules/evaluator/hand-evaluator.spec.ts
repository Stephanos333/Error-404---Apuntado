import { ContractCard, ContractSuit, SUITS } from '../contract/game-rule.plugin';
import { HandEvaluator, isRun, isSameRankGroup, cardPoints } from './hand-evaluator';

const c = (value: number, suit: ContractSuit = 'HEART'): ContractCard => ({ rank: value, suit: suit });

/** Every combination with repetition of k cards over the 52-card deck. */
function countValid(evaluator: HandEvaluator, k: number): number {
	const deck: ContractCard[] = Array.from({ length: 13 }, (_, i) => i + 1).flatMap((value) => SUITS.map((suit) => c(value, suit)));
	let valid = 0;
	const walk = (from: number, current: ContractCard[]): void => {
		if (current.length === k) {
			if (evaluator.isMeld(current)) valid++;
			return;
		}
		for (let i = from; i < deck.length; i++) walk(i, [...current, deck[i]]);
	};
	walk(0, []);
	return valid;
}

describe('HandEvaluator', () => {
	const evaluator = new HandEvaluator();

	describe('regression oracle against the prototype tables', () => {
		it('accepts exactly the 260 threes of AllowedTrips', () => {
			expect(countValid(evaluator, 3)).toBe(260);
		});

		it('accepts exactly the 299 fours of AllowedQuads', () => {
			expect(countValid(evaluator, 4)).toBe(299);
		});
	});

	describe('groups of the same rank', () => {
		it('accepts three or four cards of the same rank', () => {
			expect(isSameRankGroup([c(7, 'CLUB'), c(7, 'HEART'), c(7, 'SPADE')])).toBe(true);
			expect(evaluator.isFour([c(1, 'CLUB'), c(1, 'CLUB'), c(1, 'DIAMOND'), c(1, 'DIAMOND')])).toBe(true);
		});

		it('rejects three copies of the same card (there are only two decks)', () => {
			expect(evaluator.isThree([c(7, 'CLUB'), c(7, 'CLUB'), c(7, 'CLUB')])).toBe(false);
		});

		it('rejects different ranks of different suits', () => {
			expect(evaluator.isThree([c(7, 'CLUB'), c(8, 'HEART'), c(9, 'SPADE')])).toBe(false);
		});
	});

	describe('runs', () => {
		it('accepts consecutive ranks of the same suit in any order', () => {
			expect(evaluator.isThree([c(9), c(8), c(10)])).toBe(true);
			expect(evaluator.isFour([c(11), c(10), c(12), c(13)])).toBe(true);
		});

		it('with wrap (prototype) accepts Q-K-A, K-A-2 and A-2-3', () => {
			expect(evaluator.isThree([c(12), c(13), c(1)])).toBe(true);
			expect(evaluator.isThree([c(13), c(1), c(2)])).toBe(true);
			expect(evaluator.isThree([c(1), c(2), c(3)])).toBe(true);
			expect(evaluator.isFour([c(12), c(13), c(1), c(2)])).toBe(true);
		});

		it('without wrap accepts Q-K-A and A-2-3 but not K-A-2', () => {
			const withoutWrap = new HandEvaluator('WITHOUT_WRAP');
			expect(withoutWrap.isThree([c(12), c(13), c(1)])).toBe(true);
			expect(withoutWrap.isThree([c(1), c(2), c(3)])).toBe(true);
			expect(withoutWrap.isThree([c(13), c(1), c(2)])).toBe(false);
		});

		it('rejects mixed suits, gaps and repeated cards', () => {
			expect(isRun([c(4, 'CLUB'), c(5, 'HEART'), c(6, 'CLUB')])).toBe(false);
			expect(isRun([c(4), c(5), c(7)])).toBe(false);
			expect(isRun([c(4), c(4), c(5)])).toBe(false);
			expect(isRun([c(1), c(3), c(13)])).toBe(false);
		});
	});

	describe('closes and points', () => {
		const four = [c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE'), c(5, 'DIAMOND')];
		const three1 = [c(1, 'SPADE'), c(2, 'SPADE'), c(3, 'SPADE')];
		const three2 = [c(13, 'CLUB'), c(13, 'HEART'), c(13, 'SPADE')];

		it('recognizes 1 four + 2 threes in any order', () => {
			expect(evaluator.isFourAndTwoThrees([three1, four, three2])).toBe(true);
			expect(evaluator.isFourAndTwoThrees([three1, three2, three2])).toBe(false);
		});

		it('recognizes 3 threes', () => {
			expect(evaluator.areThreeThrees([three1, three2, four.slice(0, 3)])).toBe(true);
			expect(evaluator.areThreeThrees([three1, three2, four])).toBe(false);
		});

		it('uses the prototype points table (A, J, Q and K are worth 10)', () => {
			expect([1, 2, 9, 10, 11, 12, 13].map((v) => cardPoints(c(v)))).toEqual([10, 2, 9, 10, 10, 10, 10]);
		});

		it('only penalizes the groups that do not meld and the leftovers', () => {
			const invalid = [c(2, 'CLUB'), c(9, 'HEART'), c(4, 'SPADE')];
			expect(evaluator.unmatchedPoints([three1, invalid], [c(3)])).toBe(2 + 9 + 4 + 3);
		});

		it('rejects cards outside the range of the contract', () => {
			expect(evaluator.isThree([c(0), c(1), c(2)])).toBe(false);
			expect(evaluator.isThree([c(5, 'X' as ContractSuit), c(5), c(5, 'CLUB')])).toBe(false);
		});
	});
});
