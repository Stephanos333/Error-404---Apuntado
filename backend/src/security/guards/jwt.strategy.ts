import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserDecoratorType } from '../user.decorator';
import * as process from 'process';

/**
 * Logic of the guard used by
 * every service of the application.
 *
 * @class
 * @extends {extends PassportStrategy(Strategy)}
 */
export class JwtStrategy extends PassportStrategy(Strategy) {

	/**
	 * - Determines where the token must be extracted from.
	 * - Determines that the expiration must not be ignored.
	 * - Determines the secret used to decode the token.
	 */
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: process.env.JWT_SECRET,
		});
	}

	/**
	 * Stores the token information in the user's request.
	 * @param {UserDecoratorType} payload The information extracted from the token.
	 * @returns {UserDecoratorType} The information stored in the user's request.
	 */
	async validate(payload: UserDecoratorType): Promise<UserDecoratorType> {
		return { userId: payload.userId };
	}
}