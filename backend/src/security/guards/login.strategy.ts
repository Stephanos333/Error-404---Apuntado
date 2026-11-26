import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { SessionService } from '../session.service';
import { UserDTO } from '../../domain/user/user';
import { Injectable } from '@nestjs/common';

/**
 * Logic to perform the
 * login of the application.
 * @class
 * @extends {PassportStrategy(Strategy)}
 */
@Injectable()
export class LoginStrategy extends PassportStrategy(Strategy) {

	/**
	 * Defines:
	 * - The login parameter of the strategy.
	 * @param {SessionService} service Service to handle sessions.
	 */
	constructor(private readonly service: SessionService) {
		super({ usernameField: 'username' });
	}

	/**
	 * Logic of the application login.
	 *
	 * @param {string} username The username of who logs in.
	 * @param {string} password The password of who logs in.
	 * @returns {Promise<UserDTO | undefined>} The user when the credentials are valid.
	 */
	async validate(username: string, password: string): Promise<UserDTO> {
		return (await this.service.login(username, password)).toDTO();
	}
}