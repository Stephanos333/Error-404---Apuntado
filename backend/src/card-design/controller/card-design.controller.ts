import { Controller, Get } from '@nestjs/common';
import { CardDesignControllerConstants } from './card-design.controller.constants';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CardDesignService } from '../../application/card-design/card-design.service';
import { AuthDecorator } from '../../security/auth.decorator';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { GetActiveCardDesignsControllerResponse } from './responses/get-active-card-design.controller.response';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { UserService } from '../../application/user/user.service';
import { User } from '../../domain/user/user';
import { UserId } from '../../domain/user/user-id';
import { GetCurrentCardDesignControllerResponse } from './responses/get-current-card-design.controller.response';
import { CardDesign } from '../../domain/card-design/card-design';

/**
 * Entry points of the application
 * for the card designs.
 * @class
 */
@Controller(CardDesignControllerConstants.CONTROLLER_PREFIX)
@ApiTags(CardDesignControllerConstants.CONTROLLER_TAG)
export class CardDesignController {

	/**
	 * @param {CardDesignService} service The services to interact
	 * with the card designs.
	 * @param {UserService} userService The services to interact
	 * with the users.
	 */
	constructor(
		private readonly service: CardDesignService,
		private readonly userService: UserService,
	) {
	}

	/**
	 * GET controller that lets a user access the active card
	 * designs.
	 * @param {UserDecoratorType} user The user accessing the data.
	 * @returns {GetActiveCardDesignsControllerResponse} The card designs.
	 */
	@Get(CardDesignControllerConstants.GET_ACTIVE_CARD_DESIGNS_URL)
	@AuthDecorator()
	@ApiOkResponse({ type: GetActiveCardDesignsControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async getActive(@UserDecorator() user: UserDecoratorType): Promise<GetActiveCardDesignsControllerResponse> {
		const response: GetActiveCardDesignsControllerResponse = new GetActiveCardDesignsControllerResponse();
		const userData: User = await this.userService.getById(new UserId(user.userId));
		const data = await this.service.getAvailable(userData.cardDesigns);
		response.data = await Promise.all(data.map(async (data) => {
			return {
				...data.cardDesign.toDTO(),
				canSelect: data.canSelect,
			};
		}));
		return response;
	}

	/**
	 * GET controller that lets the user check their current card design.
	 * @param {UserDecoratorType} user The user accessing the card design
	 * @returns {GetCurrentCardDesignControllerResponse} The current card design.
	 */
	@Get(CardDesignControllerConstants.GET_CURRENT_CARD_DESIGN)
	@AuthDecorator()
	@ApiOkResponse({ type: GetCurrentCardDesignControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async getCurrent(@UserDecorator() user: UserDecoratorType): Promise<GetCurrentCardDesignControllerResponse> {
		const response: GetCurrentCardDesignControllerResponse = new GetCurrentCardDesignControllerResponse();
		const userData: User = await this.userService.getById(new UserId(user.userId));
		const data: CardDesign = await this.service.getActiveById(userData.currentDesignId);
		response.design = data.toDTO();
		return response;
	}
}