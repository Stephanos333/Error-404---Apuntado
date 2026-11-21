import { GameService } from '../../aplicacion/game/game.service';
import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { GameControllerConstants } from './game.controller.constants';
import { ApiCreatedResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthDecorator } from '../../security/auth.decorator';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { GameControllerResponse } from './responses/game.controller.response';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { CreateGameControllerRequest } from './requests/create-game.controller.request';
import { Game, GameDTO } from '../../dominio/game/game';
import { UserId } from '../../dominio/user/user-id';
import { GetPublicGamesControllerResponse } from './responses/get-public-games.controller.response';
import { GetCurrentGameControllerResponse } from './responses/get-current-game.controller.response';
import { GameAuthDecorator } from '../../security/game-auth.decorator';
import { GameDecorator } from '../../security/game.decorator';
import { PlayerService } from '../../aplicacion/player/player.service';
import { GameId } from '../../dominio/game/game-id';
import { JoinGameControllerRequest } from './requests/join-game-controller.request';
import { TurnOrchestrator } from '../../aplicacion/partida/turn-orchestrator.service';
import { DefaultResponse } from '../../shared/default.response';

/**
 * Clase que contiene los puntos de entrada a la aplicación
 * para los usuarios.
 * @class
 */
@Controller(GameControllerConstants.CONTROLLER_PREFIX)
@ApiTags(GameControllerConstants.CONTROLLER_TAG)
export class GameController {

	/**
	 * @param {GameService} service Los servicios que permiten interactuar con los juegos.
	 * @param {PlayerService} playerService Los servicios que permiten interactuar con los jugadores.
	 * @param {TurnOrchestrator} orquestador El orquestador de turnos (estado de la partida).
	 */
	constructor(
		private readonly service: GameService,
		private readonly playerService: PlayerService,
		private readonly orquestador: TurnOrchestrator,
	) {
	}

	/**
	 * Controlador POST que permite crear un juego.
	 * @param {CreateGameControllerRequest} body Los datos requeridos para crear el juego.
	 * @param {UserDecoratorType} user El usuario que está generando el juego.
	 * @returns {GameControllerResponse} La respuesta con el juego generado.
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
	 * Controlador GET que permite traer el juego actual de un jugador.
	 * @param {UserDTO} user Los datos de autenticación del usuario.
	 * @param {GameDTO} game El juego solicitado.
	 * @returns {GetPublicGamesControllerResponse} La respuesta del controlador
	 * con el juego solicitado.
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
		if (game.partidaId) {
			// Solo la vista pública: las cartas privadas se consultan en GET /partidas/actual.
			response.partida = (await this.orquestador.obtenerEstado(game.partidaId, user.userId)).publica;
		}
		return response;
	}

	/**
	 * Controlador GET que permite traer todos los juegos públicos y disponibles.
	 * @returns {GetPublicGamesControllerResponse} La respuesta que contiene los juegos públicos
	 * disponibles.
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
	 * Controlador PATCH que permite que un jugador ingrese a un juego.
	 * @param {JoinGameControllerRequest} body Los datos requeridos para ingresar a un juego.
	 * @param {UserDecoratorType} user El usuario que ingresa al juego.
	 * @returns {GameControllerConstants} La respuesta del controlador con el juego al que se ingresó.
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
	 * Controlador DELETE que permite cancelar o abandonar la sala de espera actual.
	 * @param {UserDecoratorType} user El usuario autenticado.
	 * @returns {Promise<DefaultResponse>} La respuesta de la operación.
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