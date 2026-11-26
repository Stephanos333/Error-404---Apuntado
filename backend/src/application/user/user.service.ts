import { Inject, Injectable, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserDocument } from '../../database/user.schema';
import { User, UserDTO } from '../../domain/user/user';
import { UserNotFoundException } from '../../domain/user/exceptions/user-not-found.exception';
import { UserId } from '../../domain/user/user-id';
import { UserAlreadyExistsException } from '../../domain/user/exceptions/user-already-exists.exception';
import { UserPassword } from '../../domain/user/user-password';
import { CardDesign } from '../../domain/card-design/card-design';
import { UserStatusConstants } from '../../domain/user/user-status.constants';
import { DatabaseConstants } from '../../database/database.constants';
import { UserNotUpdatedException } from '../../domain/user/exceptions/user-not-updated.exception';
import {
	CardDesignWithoutPurchasingException,
} from '../../domain/card-design/exceptions/card-design-without-purchasing.exception';
import { UserIcon } from '../../domain/user/user-icon';
import * as process from 'process';

/**
 * Class with the services to interact with the
 * users of the system.
 * @class
 */
@Injectable()
export class UserService {

	private readonly logger: Logger = new Logger(UserService.name);

	/**
	 * @param {Model<UserDocument>} model Model to interact with
	 * the users database.
	 */
	constructor(@Inject(DatabaseConstants.USER_PROVIDER) private readonly model: Model<UserDocument>) {
	}

	/**
	 * Creates a user.
	 * @param {string} username The username.
	 * @param {string} password The user's password.
	 * @param {CardDesign} defaultDesign The default card design the user is registered with.
	 * @returns {Promise<User>} The created user.
	 * @throws {UserAlreadyExistsException} When trying to create a user that already exists.
	 */
	async create(username: string, password: string, defaultDesign: CardDesign): Promise<User> {
		this.logger.log(`[${this.create.name}] INIT :: username: ${username}`);
		if ((await this.getByUsername(username, false))) throw new UserAlreadyExistsException();
		UserPassword.validate(password);
		const user: User = User.fromDTO({
			userId: UserId.create(),
			password: UserPassword.hash(password),
			status: UserStatusConstants.ACTIVE,
			tokens: Number(process.env.APP_DEFAULT_TOKENS),
			currentDesignId: defaultDesign.cardDesignId.toString(),
			currentDesignName: defaultDesign.name,
			icon: UserIcon.generate(),
			username: username,
			cardDesigns: [],
		});
		await new this.model(user.toDTO()).save();
		this.logger.log(`[${this.create.name}] FINISH ::`);
		return user;
	}

	/**
	 * Finds a user by id and validates that it exists.
	 * @param {UserId} userId The requested user.
	 * @param {boolean} [throwExceptionIfNotFound=true] Whether an exception must be thrown
	 * when the requested user does not exist.
	 * @returns {Promise<User | undefined>} The requested user when found; when
	 * throwExceptionIfNotFound=false and the user does not exist, undefined.
	 * @throws {UserNotFoundException} When throwExceptionIfNotFound=true and the requested user
	 * does not exist.
	 */
	async getById(userId: UserId, throwExceptionIfNotFound: boolean = true): Promise<User | undefined> {
		this.logger.log(`[${this.getById.name}] INIT :: userId: ${userId.toString()}`);
		const found: UserDTO = await this.model.findOne({ userId: userId.toString() });
		const mapped: User = found ? User.fromDTO(found) : undefined;
		if (throwExceptionIfNotFound && !mapped) throw new UserNotFoundException();
		this.logger.log(`[${this.getById.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Finds a user by username and validates that it exists.
	 * @param {string} username The requested user.
	 * @param {boolean} [throwExceptionIfNotFound=true] Whether an exception must be thrown
	 * when the requested user does not exist.
	 * @returns {Promise<User | undefined>} The requested user when found; when
	 * throwExceptionIfNotFound=false and the user does not exist, undefined.
	 * @throws {UserNotFoundException} When throwExceptionIfNotFound=true and the requested user
	 * does not exist.
	 */
	async getByUsername(username: string, throwExceptionIfNotFound: boolean = true): Promise<User | undefined> {
		this.logger.log(`[${this.getByUsername.name}] INIT :: username: ${username}`);
		const found: UserDTO = await this.model.findOne({ username });
		const mapped: User = found ? User.fromDTO(found) : undefined;
		if (throwExceptionIfNotFound && !mapped) throw new UserNotFoundException();
		this.logger.log(`[${this.getByUsername.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Updates all the information of a user.
	 * @param {User} user The user being updated
	 * @return {User} The updated user.
	 * @throws {UserNotUpdatedException} When the update request could not
	 * be performed.
	 */
	async update(user: User): Promise<User> {
		this.logger.log(`[${this.update.name}] INIT :: updating: ${user.userId.toString()}`);
		const updated: UserDTO = await this.model.findOneAndUpdate(
			{ userId: user.userId.toString() },
			user.toDTO(),
			{ new: true },
		);
		const mapped: User = updated ? User.fromDTO(updated) : undefined;
		if (!mapped) throw new UserNotUpdatedException();
		this.logger.log(`[${this.update.name}] FINISH :: `);
		return mapped;
	}

	/**
	 * Updates the card design of a user.
	 * @param {UserId} userId The user to update.
	 * @param {CardDesign} cardDesign The new card design.
	 * @returns {Promise<User>} The updated user.
	 */
	async updateCardDesign(userId: UserId, cardDesign: CardDesign): Promise<User> {
		this.logger.log(`[${this.updateCardDesign.name}] INIT :: userId: ${userId.toString()}`);
		const user: User = await this.getById(userId);
		if (!cardDesign.isFree && !user.cardDesigns.has(cardDesign.cardDesignId.toString())) {
			throw new CardDesignWithoutPurchasingException();
		}
		user.currentDesignId = cardDesign.cardDesignId;
		user.currentDesignName = cardDesign.name;
		const updated: User = await this.update(user);
		this.logger.log(`[${this.updateCardDesign.name}] FINISH ::`);
		return updated;
	}

	/**
	 * Updates the icon of a user.
	 * @param userId The user to update.
	 * @param userIcon The new icon of the user.
	 * @returns The updated user.
	 */
	async updateIcon(userId: UserId, userIcon: UserIcon): Promise<User> {
		this.logger.log(`[${this.updateIcon.name}] INIT :: userId: ${userId?.toString()}`);
		const user: User = await this.getById(userId);
		user.icon = userIcon;
		const updated: User = await this.update(user);
		this.logger.log(`[${this.updateIcon.name}] FINISH ::`);
		return updated;
	}
}