import { DiscreteValueObject } from './discrete.value-object';

/**
 * Statuses of an object of the application.
 *
 * @class
 * @template T The status constants.
 * @extends StringValueObject
 */
export abstract class StatusValueObject<T extends string> extends DiscreteValueObject {

	/**
	 * @param {string} value The stored value.
	 * @protected
	 */
	constructor(value: string) {
		super(value);
	}

	/**
	 * Checks whether the status matches a given value.
	 * @param {T} value The value to compare.
	 * @returns {boolean} Whether the value matches.
	 */
	is(value: T): boolean {
		return this.value === value;
	}

	/**
	 * Changes the status of an object to another one.
	 * @param {T} value The new status.
	 */
	change(value: T): void {
		this.value = value;
	}
}