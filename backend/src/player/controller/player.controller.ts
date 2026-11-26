import { PlayerService } from '../../application/player/player.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlayerControllerConstants } from './player.controller.constants';
import { GameAuthDecorator } from '../../security/game-auth.decorator';
import { PlayerControllerResponse } from './responses/player.controller.response';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { Player } from '../../domain/player/player';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { UserId } from '../../domain/user/user-id';
import { User } from '../../domain/user/user';
import { UserService } from '../../application/user/user.service';

/**
 * Controller of the players (room membership).
 *
 * The turn commands (draw, discard, close) moved to `MatchPlayController`
 * (`/matches/current/commands/*`): they operate on the `matches` aggregate with optimistic
 * concurrency and idempotency (ADR-04).
 */
@Controller(PlayerControllerConstants.CONTROLLER_PREFIX)
@ApiTags(PlayerControllerConstants.CONTROLLER_TAG)
export class PlayerController {
	/**
	 * @param {UserService} userService The user services.
	 * @param {PlayerService} playerService The player services.
	 */
	constructor(
		private readonly userService: UserService,
		private readonly playerService: PlayerService,
	) {}

	/**
	 * GET entry point that fetches the current player of a user.
	 * @param {UserDecoratorType} user The user consuming the service.
	 * @returns {PlayerControllerResponse} The current player.
	 */
	@Get(PlayerControllerConstants.GET_CURRENT_PLAYER_URL)
	@GameAuthDecorator()
	@ApiOkResponse({ type: PlayerControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async getCurrentPlayer(@UserDecorator() user: UserDecoratorType): Promise<PlayerControllerResponse> {
		const response: PlayerControllerResponse = new PlayerControllerResponse();
		const userId: UserId = new UserId(user.userId);
		const userData: User = await this.userService.getById(userId);
		const player: Player = await this.playerService.getActiveByUserId(userId);
		response.player = await player.toDTO();
		response.currentDesignName = userData.currentDesignName;
		return response;
	}
}
