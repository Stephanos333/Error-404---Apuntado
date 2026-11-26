import { Controller, Post } from '@nestjs/common';
import { GameAuthDecorator } from '../../security/game-auth.decorator';
import { ApiCreatedResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { MatchControllerConstants } from './match.controller.constants';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { GameDecorator } from '../../security/game.decorator';
import { Game, GameDTO } from '../../domain/game/game';
import { UserId } from '../../domain/user/user-id';
import { DefaultResponse } from '../../shared/default.response';
import { TurnOrchestrator } from '../../application/match/turn-orchestrator.service';
/**
 * Entry points of the application to start the matches.
 */
@Controller(MatchControllerConstants.CONTROLLER_PREFIX)
@ApiTags(MatchControllerConstants.CONTROLLER_TAG)
export class MatchController {
	/**
	 * @param {TurnOrchestrator} orchestrator The turn orchestrator.
	 */
	constructor(private readonly orchestrator: TurnOrchestrator) {
	}
	/**
	 * POST controller that starts the match of the current game: charges the bets, creates the
	 * `matches` aggregate and deals the first round in a single transaction (ADR-04).
	 * @param {UserDecoratorType} user The user starting the match.
	 * @param {GameDTO} game The game the match belongs to.
	 * @returns {DefaultResponse} The response of the service.
	 */
	@Post()
	@GameAuthDecorator()
	@ApiCreatedResponse({ type: DefaultResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async start(
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
	): Promise<DefaultResponse> {
		await this.orchestrator.startMatch(Game.fromDTO(game), new UserId(user.userId));
		return new DefaultResponse();
	}
}
