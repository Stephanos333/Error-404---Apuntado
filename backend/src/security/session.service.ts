import { UserService } from '../application/user/user.service';
import { User } from '../domain/user/user';
import { Injectable, Logger } from '@nestjs/common';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception';
import { UserId } from '../domain/user/user-id';
import { JwtService } from '@nestjs/jwt';
import { UserDecoratorType } from './user.decorator';
import { ExceptionMessagesConstants } from '../shared/exceptions/exception-messages.constants';

/**
 * Class with the services to interact with the
 * sessions of the system
 * @class
 */
@Injectable()
export class SessionService {

	private readonly logger: Logger = new Logger(SessionService.name);

	/**
	 * @param {JwtService} jwtService Service to generate jwt tokens.
	 * @param {UserService} userService Service of the users.
	 */
	constructor(private readonly jwtService: JwtService,
		private readonly userService: UserService,
	) {
	}

	/**
	 * Generates the access token of a user.
	 * @param {UserId} userId The id stored in the token.
	 * @returns {string} The generated access token.
	 */
	generateAccessToken(userId: UserId): string {
		const toSign: UserDecoratorType = { userId: userId.toString() };
		return this.jwtService.sign(toSign, {
			secret: process.env.JWT_SECRET,
			expiresIn: process.env.JWT_EXPIRATION_TIME,
		});
	}

	/**
	 * Generates the token used to refresh the access token of a user.
	 * @param {UserId} userId The id stored in the token.
	 * @returns {string} The generated refresh token.
	 */
	generateRefreshToken(userId: UserId): string {
		const toSign: UserDecoratorType = { userId: userId.toString() };
		return this.jwtService.sign(toSign, {
			secret: process.env.JWT_REFRESH_SECRET,
			expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
		});
	}

	/**
	 * Refreshes the access token of a user.
	 * @param {string} refreshToken The token that lets the user refresh their access token.
	 * @return {string} The new access token.
	 */
	refreshAccessToken(refreshToken: string): string {
		try {
			const decoded: UserDecoratorType = this.jwtService.verify(refreshToken, {
				secret: process.env.JWT_REFRESH_SECRET,
			});
			return this.generateAccessToken(new UserId(decoded.userId));
		} catch (e) {
			throw new InvalidCredentialsException(ExceptionMessagesConstants.INVALID_REFRESH_TOKEN_ERROR);
		}
	}

	/**
	 * Login logic for the users.
	 * @param {string} username The user requesting to log in.
	 * @param {string} password The credentials of the user.
	 * @returns {Promise<User>} The user requesting the session.
	 * @throws {InvalidCredentialsException} When the session credentials of a user
	 * are invalid.
	 */
	async login(username: string, password: string): Promise<User> {
		this.logger.log(`[${this.login.name}] INIT :: username: ${username}`);
		const user: User = await this.userService.getByUsername(username);
		if (!user.password.compare(password)) throw new InvalidCredentialsException();
		this.logger.log(`[${this.login.name}] FINISH ::`);
		return user;
	}
}