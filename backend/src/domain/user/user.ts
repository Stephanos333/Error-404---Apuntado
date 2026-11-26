import { UserId } from './user-id';
import { UserPassword } from './user-password';
import { UserStatus } from './user-status';
import { DomainBase } from '../../shared/domain.base';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { CardDesignId } from '../../card/card-design-id';
import { UserIcon } from './user-icon';
import { UserStatusConstants } from './user-status.constants';
import { UserIsAlreadyPlayingException } from './exceptions/user-is-already-playing.exception';
import { NotEnoughTokensException } from './exceptions/not-enough-tokens.exception';

/**
 * Transfer object
 * of a user.
 * @class
 */
export class UserDTO {
	@ApiProperty() userId: string;
	@ApiHideProperty() password: string;
	@ApiProperty() status: string;
	@ApiProperty() username: string;
	@ApiProperty() icon: string;
	@ApiProperty() currentDesignId: string;
	@ApiProperty() currentDesignName: string;
	@ApiProperty() tokens: number;
	@ApiHideProperty() cardDesigns: Array<string>;
}

/**
 * A user and its available actions.
 *
 * @class
 * @extends {DomainBase<UserDTO>}
 */
export class User extends DomainBase<UserDTO> {
	public readonly password: UserPassword;
	public readonly userId: UserId;
	public currentDesignId: CardDesignId;
	public currentDesignName: string;
	public readonly cardDesigns: Set<string>;
	public icon: UserIcon;
	public readonly status: UserStatus;
	private readonly username: string;
	private tokens: number;

	/**
	 * @param {User} userId The ID of the user.
	 * @param {UserPassword} password The password of the user.
	 * @param {UserStatus} status The status of the user.
	 * @param {CardDesignId} currentDesignId The user's current card design.
	 * @param {string} currentDesignName The name of the current card design.
	 * @param {string} username The name of the user.
	 * @param {UserIcon} icon The icon of the user.
	 * @param {number} tokens The number of tokens of the user.
	 * @param {string} cardDesigns The card designs bought by the user.
	 */
	constructor(
		userId: UserId,
		password: UserPassword,
		status: UserStatus,
		currentDesignId: CardDesignId,
		currentDesignName: string,
		username: string,
		icon: UserIcon,
		tokens: number,
		cardDesigns: Set<string>,
	) {
		super();
		this.userId = userId;
		this.password = password;
		this.status = status;
		this.currentDesignId = currentDesignId;
		this.currentDesignName = currentDesignName;
		this.username = username;
		this.icon = icon;
		this.tokens = tokens;
		this.cardDesigns = cardDesigns;
	}

	/**
	 * Converts the transfer object of a user into the domain
	 * model.
	 * @param {UserDTO} dto The transfer object.
	 * @returns {User} The domain model.
	 * @static
	 */
	static fromDTO(dto: UserDTO): User {
		return new User(
			new UserId(dto.userId),
			new UserPassword(dto.password),
			new UserStatus(dto.status),
			new CardDesignId(dto.currentDesignId),
			dto.currentDesignName,
			dto.username,
			new UserIcon(dto.icon),
			dto.tokens,
			new Set<string>(dto.cardDesigns),
		);
	}

	/**
	 * Converts the user into its transfer object.
	 * @returns {UserDTO} The transfer object of the user.
	 */
	toDTO(): UserDTO {
		return {
			cardDesigns: Array.from(this.cardDesigns),
			currentDesignId: this.currentDesignId.toString(),
			currentDesignName: this.currentDesignName,
			icon: this.icon.toString(),
			password: this.password.toString(),
			status: this.status.toString(),
			tokens: this.tokens,
			userId: this.userId.toString(),
			username: this.username,
		};
	}

	/**
	 * Changes the status of a user, running the corresponding validations.
	 * @param {UserStatusConstants} status The new status of the user.
	 * @throws {UserIsAlreadyPlayingException} When the user is already playing and tries to join a game.
	 */
	changeStatus(
		status: UserStatusConstants,
	): void {
		switch (status) {
		case UserStatusConstants.PLAYING: {
			if (this.status.is(UserStatusConstants.PLAYING)) throw new UserIsAlreadyPlayingException();
			break;
		}
		}
		this.status.change(status);
	}

	/**
	 * Subtracts tokens from a user, running the corresponding validations.
	 * @param {number} value The number of tokens to subtract.
	 * @throws {NotEnoughTokensException} When the amount to subtract
	 * exceeds the available tokens.
	 */
	removeTokens(value: number): void {
		this.ensureEnoughTokens(value);
		this.tokens -= Math.trunc(Math.abs(value));
	}

	/**
	 * Validates that the user has enough tokens, without subtracting them. The bet is charged
	 * when the match starts, in the same transaction that records it in the token ledger.
	 * @param {number} value The required number of tokens.
	 * @throws {NotEnoughTokensException} When the user does not have enough tokens.
	 */
	ensureEnoughTokens(value: number): void {
		if (Math.trunc(Math.abs(value)) > this.tokens) throw new NotEnoughTokensException();
	}

}