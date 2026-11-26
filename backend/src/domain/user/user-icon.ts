import { UserIconConstants } from './user-icon.constants';
import { InvalidUserIconException } from './exceptions/invalid-user-icon.exception';
import { DiscreteValueObject } from '../../shared/discrete.value-object';

/**
 * Icon of a user.
 * @class
 * @extends StringValueObject
 */
export class UserIcon extends DiscreteValueObject {

	/**
	 * Picks a random user icon
	 * @returns {string} The selected icon.
	 * @static
	 */
	static generate(): string {
		const icons: Array<string> = [
			UserIconConstants.ICON1,
			UserIconConstants.ICON2,
			UserIconConstants.ICON3,
			UserIconConstants.ICON4,
			UserIconConstants.ICON5,
		];
		return icons[Math.floor(Math.random() * icons.length)];
	}

	/**
	 * Determines whether the icon of a user is not valid.
	 * @param {string} value The icon of a user.
	 * @protected
	 * @throws {InvalidUserIconException} When the user icon is not valid.
	 */
	protected validate(value: string): void {
		if (!(value in UserIconConstants)) throw new InvalidUserIconException();
	}
}