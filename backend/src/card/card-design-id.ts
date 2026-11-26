import { IdValueObject } from '../shared/id.value-object';
import { InvalidCardDesignIdException } from './exceptions/invalid-card-design-id.exception';
import * as uuid from 'uuid';

/**
 * ID of a card design.
 * @class
 * @extends {IdValueObject}
 */
export class CardDesignId extends IdValueObject {

	/**
	 * Validates the characteristics of a card design
	 * ID.
	 * @param {string} value The ID to validate.
	 * @protected
	 * @throws {InvalidCardDesignIdException} When the ID is not valid.
	 */
	protected validate(value: string) {
		if (!uuid.validate(value)) throw new InvalidCardDesignIdException();
	}
}