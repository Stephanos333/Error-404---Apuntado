import { DiscreteValueObject } from '../shared/discrete.value-object';
import { CardSuitConstants } from './card-suit.constants';
import { InvalidCardSuitException } from './exceptions/invalid-card-suit-exception';

/**
 * Suit of a card.
 * @class
 * @extends DiscreteValueObject
 */
export class CardSuit extends DiscreteValueObject {

	/**
	 * Determines whether the suit of a card is not valid.
	 * @param {string} value The suit of the card.
	 * @throws {InvalidCardSuitException} When the suit of the card is not valid.
	 * @protected
	 */
	protected validate(value: string): void {
		if (!(value in CardSuitConstants)) throw new InvalidCardSuitException();
	}
}