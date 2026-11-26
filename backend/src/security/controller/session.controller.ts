import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { LoginGuard } from '../guards/login.guard';
import { ApiBody, ApiCreatedResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginControllerRequest } from './requests/login.controller.request';
import { LoginControllerResponse } from './responses/login.controller.response';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { SessionControllerConstants } from './session.controller.constants';
import { SessionService } from '../session.service';
import { UserDecorator } from '../user.decorator';
import { UserDTO } from '../../domain/user/user';
import { UserId } from '../../domain/user/user-id';
import { RefreshTokenControllerRequest } from './requests/refresh-token.controller.request';
import { RefreshTokenControllerResponse } from './responses/refresh-token.controller.response';

/**
 * Entry points of the application
 * for the sessions.
 *
 * @class
 */
@Controller(SessionControllerConstants.CONTROLLER_PREFIX)
@ApiTags(SessionControllerConstants.CONTROLLER_TAG)
export class SessionController {

	/**
	 * @param {SessionService} service The services to interact
	 * with the application session.
	 */
	constructor(private readonly service: SessionService) {
	}

	/**
	 * POST controller that lets a user log in.
	 * @param {UserDTO} user The user data after logging in.
	 * @returns {LoginControllerResponse} The login
	 * response.
	 */
	@Post(SessionControllerConstants.LOGIN_URL)
	@UseGuards(LoginGuard)
	@ApiBody({ type: LoginControllerRequest })
	@ApiCreatedResponse({ type: LoginControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async login(@UserDecorator() user: UserDTO): Promise<LoginControllerResponse> {
		const response: LoginControllerResponse = new LoginControllerResponse();
		const userId: UserId = new UserId(user.userId);
		response.accessToken = this.service.generateAccessToken(userId);
		response.refreshToken = this.service.generateRefreshToken(userId);
		response.userId = user.userId;
		return response;
	}

	/**
	 * POST controller that lets a user refresh their login token.
	 * @param {RefreshTokenControllerRequest} body The data needed to refresh the
	 * user's access token.
	 * @returns {RefreshTokenControllerResponse} The new access token.
	 */
	@Post(SessionControllerConstants.REFRESH_TOKEN_URL)
	@ApiCreatedResponse({ type: RefreshTokenControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async refreshToken(@Body() body: RefreshTokenControllerRequest): Promise<RefreshTokenControllerResponse> {
		const response: RefreshTokenControllerResponse = new RefreshTokenControllerResponse();
		response.accessToken = this.service.refreshAccessToken(body.refreshToken);
		return response;
	}
}