import { GameService } from '../../application/game/game.service';
import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { GameControllerConstants } from './game.controller.constants';
import { ApiCreatedResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthDecorator } from '../../security/auth.decorator';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { GameControllerResponse } from './responses/game.controller.response';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { CreateGameControllerRequest } from './requests/create-game.controller.request';
import { Game, GameDTO } from '../../domain/game/game';
import { UserId } from '../../domain/user/user-id';
import { GetPublicGamesControllerResponse } from './responses/get-public-games.controller.response';
import { GetCurrentGameControllerResponse } from './responses/get-current-game.controller.response';
import { GameAuthDecorator } from '../../security/game-auth.decorator';
import { GameDecorator } from '../../security/game.decorator';
import { PlayerService } from '../../application/player/player.service';
import { GameId } from '../../domain/game/game-id';
import { JoinGameControllerRequest } from './requests/join-game-controller.request';
import { TurnOrchestrator } from '../../application/match/turn-orchestrator.service';
import { DefaultResponse } from '../../shared/default.response';

/**
 * Entry points of the application
 * for the games.
 * @class
 */
@Controller(GameControllerConstants.CONTROLLER_PREFIX)
@ApiTags(GameControllerConstants.CONTROLLER_TAG)
export class GameController {

	/**
	 * @param {GameService} service The services to interact with the games.
	 * @param {PlayerService} playerService The services to interact with the players.
	 * @param {TurnOrchestrator} orchestrator The turn orchestrator (match state).
	 */
	constructor(
		private readonly service: GameService,
		private readonly playerService: PlayerService,
		private readonly orchestrator: TurnOrchestrator,
	) {
	}

	/**
	 * POST controller that creates a game.
	 * @param {CreateGameControllerRequest} body The data required to create the game.
	 * @param {UserDecoratorType} user The user creating the game.
	 * @returns {GameControllerResponse} The response with the created game.
	 */
	@Post()
	@AuthDecorator()
	@ApiCreatedResponse({ type: GameControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async create(
		@Body() body: CreateGameControllerRequest,
		@UserDecorator() user: UserDecoratorType,
	): Promise<GameControllerResponse> {
		const response: GameControllerResponse = new GameControllerResponse();
		const data: Game = await this.service.create({
			creatorId: new UserId(user.userId), ...body,
		});
		response.data = data.toDTO();
		return response;
	}

	/**
	 * GET controller that fetches the current game of a player.
	 * @param {UserDTO} user The authentication data of the user.
	 * @param {GameDTO} game The requested game.
	 * @returns {GetPublicGamesControllerResponse} The controller response
	 * with the requested game.
	 */
	@Get(GameControllerConstants.GET_CURRENT_GAME_DETAIL_URL)
	@GameAuthDecorator()
	@ApiOkResponse({ type: GetCurrentGameControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async getCurrentGameDetail(
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
	): Promise<GetCurrentGameControllerResponse> {
		const response: GetCurrentGameControllerResponse = new GetCurrentGameControllerResponse();
		response.game = game;
		response.players = await this.playerService.getWithUserByGame(
			new GameId(game.gameId),
			new UserId(user.userId),
		);
		if (game.matchId) {
			// Only the public view: the private cards are fetched with GET /matches/current.
			response.match = (await this.orchestrator.getState(game.matchId, user.userId)).publicView;
		}
		return response;
	}

	/**
	 * GET controller that fetches every public and available game.
	 * @returns {GetPublicGamesControllerResponse} The response with the available public
	 * games.
	 */
	@Get(GameControllerConstants.GET_PUBLIC_GAMES_URL)
	@AuthDecorator()
	@ApiOkResponse({ type: GetPublicGamesControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async getPublic(): Promise<GetPublicGamesControllerResponse> {
		const response: GetPublicGamesControllerResponse = new GetPublicGamesControllerResponse();
		const games: Array<Game> = await this.service.getPublicAndEmpty();
		response.data = await Promise.all(games.map(async (g) => g.toDTO()));
		return response;
	}

	/**
	 * PATCH controller that lets a player join a game.
	 * @param {JoinGameControllerRequest} body The data required to join a game.
	 * @param {UserDecoratorType} user The user joining the game.
	 * @returns {GameControllerConstants} The controller response with the joined game.
	 */
	@Patch(GameControllerConstants.JOIN_GAME_URL)
	@AuthDecorator()
	@ApiOkResponse({ type: GameControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async join(
		@Body() body: JoinGameControllerRequest,
		@UserDecorator() user: UserDecoratorType,
	): Promise<GameControllerResponse> {
		const response: GameControllerResponse = new GameControllerResponse();
		const data: Game = await this.service.join(new GameId(body.gameId), new UserId(user.userId));
		response.data = data.toDTO();
		return response;
	}

	/**
	 * DELETE controller that cancels or leaves the current waiting room.
	 * @param {UserDecoratorType} user The authenticated user.
	 * @returns {Promise<DefaultResponse>} The response of the operation.
	 */
	@Delete(GameControllerConstants.GET_CURRENT_GAME_DETAIL_URL)
	@AuthDecorator()
	@ApiOkResponse({ type: DefaultResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async cancelCurrentGame(
		@UserDecorator() user: UserDecoratorType,
	): Promise<DefaultResponse> {
		await this.service.leaveOrCancel(new UserId(user.userId));
		return new DefaultResponse();
	}
}