import { StringValueObject } from './string.value-object';

export abstract class DiscreteValueObject extends StringValueObject {

	/**
	 * @param {string} value The stored value.
	 * @protected
	 */
	constructor(value: string) {
		super(value);
		this.validate(value);
	}

	/**
	 * Validates whether the status of an object is valid.
	 * @param {string} value The status to validate.
	 */
	protected abstract validate(value: string): void;
}