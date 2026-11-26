/**
 * Important strings
 * of the application.
 * @class
 */
export class StringValueObject {

	protected value: string;

	/**
	 * @param {string} value The stored value.
	 */
	constructor(value: string) {
		this.value = value;
	}

	/**
	 * Extracts the stored value and converts it into a string.
	 * @returns {string}
	 */
	toString(): string {
		return this.value;
	}
}