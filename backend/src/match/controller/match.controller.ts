import { Controller, Post } from '@nestjs/common';
import { GameAuthDecorator } from '../../security/game-auth.decorator';
import { ApiCreatedResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { MatchControllerConstants } from './match.controller.constants';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { GameDecorator } from '../../security/game.decorator';
import { Game, GameDTO } from '../../dominio/game/game';
import { UserId } from '../../dominio/user/user-id';
import { DefaultResponse } from '../../shared/default.response';
import { TurnOrchestrator } from '../../aplicacion/partida/turn-orchestrator.service';
/**
 * Clase que contiene los puntos de entrada de la aplicación para iniciar las partidas.
 */
@Controller(MatchControllerConstants.CONTROLLER_PREFIX)
@ApiTags(MatchControllerConstants.CONTROLLER_TAG)
export class MatchController {
	/**
	 * @param {TurnOrchestrator} orquestador El orquestador de turnos.
	 */
	constructor(private readonly orquestador: TurnOrchestrator) {
	}
	/**
	 * Controlador POST que inicia la partida del juego actual: cobra las apuestas, crea el
	 * agregado `partidas` y reparte la primera ronda en una sola transacción (ADR-04).
	 * @param {UserDecoratorType} user El usuario que está iniciando la partida.
	 * @param {GameDTO} game El juego al que pertenece la partida.
	 * @returns {DefaultResponse} La respuesta del servicio.
	 */
	@Post()
	@GameAuthDecorator()
	@ApiCreatedResponse({ type: DefaultResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async start(
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
	): Promise<DefaultResponse> {
		await this.orquestador.iniciarPartida(Game.fromDTO(game), new UserId(user.userId));
		return new DefaultResponse();
	}
}
