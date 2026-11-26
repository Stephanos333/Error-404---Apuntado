import { DiscreteValueObject } from '../shared/discrete.value-object';
import { CardTypeConstants } from './card-type.constants';
import { InvalidCardTypeException } from './exceptions/invalid-card-type.exception';

/**
 * Type of a card.
 * @class
 * @extends {DiscreteValueObject}
 */
export class CardType extends DiscreteValueObject {

	/**
	 * Determines whether the type of a card is not valid.
	 * @param {string} value The type of the card.
	 * @throws {InvalidCardTypeException} When the type of the card is not valid.
	 * @protected
	 */
	protected validate(value: string): void {
		if (!(value.toString() in CardTypeConstants)) throw new InvalidCardTypeException();
	}
}