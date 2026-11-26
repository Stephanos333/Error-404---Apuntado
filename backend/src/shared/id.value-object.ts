import { StringValueObject } from './string.value-object';

/**
 * Ids of the application.
 * @class
 * @abstract
 * @extends {StringValueObject}
 */
export abstract class IdValueObject extends StringValueObject {

	/**
	 * @param {string} value The stored value.
	 * @protected
	 */
	constructor(value: string) {
		super(value);
		this.validate(value);
	}

	/**
	 * Abstract function that must validate an ID of the application.
	 * @param {string} value The value to validate.
	 * @protected
	 */
	protected abstract validate(value: string): void;
}