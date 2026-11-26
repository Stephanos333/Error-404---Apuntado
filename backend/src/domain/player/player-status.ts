import { StatusValueObject } from '../../shared/status.value-object';
import { PlayerStatusConstants } from './player-status.constants';
import { InvalidPlayerStatusException } from './exceptions/invalid-player-status.exception';

/**
 * Status of a player.
 * @class
 * @extends {StatusValueObject<PlayerStatusConstants>}
 */
export class PlayerStatus extends StatusValueObject<PlayerStatusConstants> {

	/**
	 * Determines whether the status of a player is not valid.
	 * @param {string} value The status of the player.
	 * @throws {InvalidPlayerStatusException} When the status of the player is not valid.
	 * @protected
	 */
	protected validate(value: string) {
		if (!(value in PlayerStatusConstants)) throw new InvalidPlayerStatusException();
	}
}