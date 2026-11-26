import { Body, ClassSerializerInterceptor, Controller, Get, Patch, Post, UseInterceptors } from '@nestjs/common';
import { UserService } from '../../application/user/user.service';
import { UserControllerConstants } from './user.controller.constants';
import { ApiCreatedResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthDecorator } from '../../security/auth.decorator';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { GetUserControllerResponse, GetUserResponseData } from './responses/get-user-controller.response';
import { User } from '../../domain/user/user';
import { UserId } from '../../domain/user/user-id';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { CreateUserControllerRequest } from './requests/create-user.controller.request';
import { SessionService } from '../../security/session.service';
import { CreateUserControllerResponse } from './responses/create-user.controller.response';
import { UpdateUserCardDesignControllerRequest } from './requests/update-user-card-design.controller.request';
import { CardDesignId } from '../../card/card-design-id';
import { DefaultResponse } from '../../shared/default.response';
import { UpdateUserIconController } from './requests/update-user-icon.controller.request';
import { UserIcon } from '../../domain/user/user-icon';
import { CardDesignService } from '../../application/card-design/card-design.service';
import { CardDesign } from '../../domain/card-design/card-design';

/**
 * Entry points of the application
 * for the users.
 *
 * @class
 */
@Controller(UserControllerConstants.CONTROLLER_PREFIX)
@ApiTags(UserControllerConstants.CONTROLLER_TAG)
export class UserController {

	/**
	 * @param {UserService} service The services to interact with the users.
	 * @param {SessionService} sessionService The services to interact with the user's session.
	 * @param {CardDesignService} cardDesignService The services to update the user's card designs.
	 */
	constructor(
		private readonly service: UserService,
		private readonly sessionService: SessionService,
		private readonly cardDesignService: CardDesignService,
	) {
	}

	/**
	 * POST controller that creates a user.
	 * @param {CreateUserControllerRequest} body Data required to create the user.
	 * @returns {CreateUserControllerResponse} The access information of the application.
	 */
	@Post()
	@ApiCreatedResponse({ type: CreateUserControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async create(@Body() body: CreateUserControllerRequest): Promise<CreateUserControllerResponse> {
		const response: CreateUserControllerResponse = new CreateUserControllerResponse();
		const defaultDesign: CardDesign = await this.cardDesignService.getDefault();
		const user: User = await this.service.create(body.username, body.password, defaultDesign);
		response.accessToken = this.sessionService.generateAccessToken(user.userId);
		response.refreshToken = this.sessionService.generateRefreshToken(user.userId);
		response.userId = user.userId.toString();
		return response;
	}

	/**
	 * GET controller that lets a user fetch their data.
	 * @param {UserDecoratorType} user The requested user.
	 * @returns {GetUserControllerResponse} The controller response.
	 */
	@Get(UserControllerConstants.GET_ME_URL)
	@AuthDecorator()
	@UseInterceptors(ClassSerializerInterceptor)
	@ApiOkResponse({ type: GetUserControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async getById(@UserDecorator() user: UserDecoratorType): Promise<GetUserControllerResponse> {
		const response: GetUserControllerResponse = new GetUserControllerResponse();
		const data: User = await this.service.getById(new UserId(user.userId));
		response.user = new GetUserResponseData(data.toDTO());
		return response;
	}

	/**
	 * PATCH controller that updates the card design
	 * of a user.
	 * @param {UpdateUserCardDesignControllerRequest} body The desired card design.
	 * @param {UserDecoratorType} user The user being updated.
	 * @returns {GetUserControllerResponse} The controller response.
	 */
	@Patch(UserControllerConstants.UPDATE_USER_CARD_DESIGN_URL)
	@AuthDecorator()
	@ApiOkResponse({ type: GetUserControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async updateCardDesign(
		@Body() body: UpdateUserCardDesignControllerRequest,
		@UserDecorator() user: UserDecoratorType,
	): Promise<GetUserControllerResponse> {
		const response: GetUserControllerResponse = new GetUserControllerResponse();
		const cardDesign: CardDesign = await this.cardDesignService.getActiveById(new CardDesignId(body.cardDesignId));
		const data: User = await this.service.updateCardDesign(new UserId(user.userId), cardDesign);
		response.user = new GetUserResponseData(data.toDTO());
		return response;
	}

	/**
	 * PATCH controller that updates the icon of a user.
	 * @param body The desired icon.
	 * @param user The user being updated.
	 * @returns {DefaultResponse} The controller response.
	 */
	@Patch(UserControllerConstants.UPDATE_USER_ICON)
	@AuthDecorator()
	@ApiOkResponse({ type: DefaultResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async updateIcon(
		@Body() body: UpdateUserIconController,
		@UserDecorator() user: UserDecoratorType,
	): Promise<DefaultResponse> {
		await this.service.updateIcon(
			new UserId(user.userId),
			new UserIcon(body.icon),
		);
		return new DefaultResponse();
	}
}