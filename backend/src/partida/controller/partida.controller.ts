import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GameAuthDecorator } from '../../security/game-auth.decorator';
import { GameDecorator } from '../../security/game.decorator';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { GameDTO } from '../../dominio/game/game';
import { vistaPrivada, vistaPublica } from '../../dominio/partida/vistas-partida';
import { PartidaNotFoundException } from '../../dominio/partida/partida.exceptions';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { ComandoTurno, ResultadoComando, TurnOrchestrator } from '../../aplicacion/partida/turn-orchestrator.service';
import { PartidaControllerConstants } from './partida.controller.constants';
import { CerrarRequest, ComandoTurnoRequest, DescartarRequest, RobarRequest } from './requests/comando-turno.request';
import { PartidaControllerResponse } from './responses/partida.controller.response';

/**
 * Puntos de entrada de los comandos de turno sobre el agregado `partidas` (ADR-04/05).
 *
 * La partida se resuelve a partir del juego actual del usuario autenticado (guardia del
 * juego): un jugador no puede actuar sobre la partida de otro. Un comando que pierde la
 * carrera responde 409 con `RONDA_YA_CERRADA`, `TURNO_NO_CORRESPONDE` o
 * `VERSION_DESACTUALIZADA`.
 * @class
 */
@Controller(PartidaControllerConstants.CONTROLLER_PREFIX)
@ApiTags(PartidaControllerConstants.CONTROLLER_TAG)
export class PartidaController {
	/**
	 * @param {TurnOrchestrator} orquestador El orquestador de turnos.
	 */
	constructor(private readonly orquestador: TurnOrchestrator) {}

	/**
	 * Estado actual de la partida del usuario (RF-14): para reconectarse o tras un salto de versión.
	 */
	@Get(PartidaControllerConstants.ESTADO_URL)
	@GameAuthDecorator()
	@ApiOkResponse({ type: PartidaControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async estado(@UserDecorator() user: UserDecoratorType, @GameDecorator() game: GameDTO): Promise<PartidaControllerResponse> {
		const estado = await this.orquestador.obtenerEstado(this.partidaDe(game), user.userId);
		return Object.assign(new PartidaControllerResponse(), { aplicado: false, partida: estado.publica, mano: estado.privada });
	}

	/** Comando robar. */
	@Post(PartidaControllerConstants.ROBAR_URL)
	@HttpCode(HttpStatus.OK)
	@GameAuthDecorator()
	@ApiOkResponse({ type: PartidaControllerResponse })
	@ApiConflictResponse({ type: ExceptionResponseDTO })
	async robar(
		@Body() body: RobarRequest,
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
	): Promise<PartidaControllerResponse> {
		return this.responder(await this.orquestador.robar(this.comando(body, user, game), body.origen), user);
	}

	/** Comando descartar. */
	@Post(PartidaControllerConstants.DESCARTAR_URL)
	@HttpCode(HttpStatus.OK)
	@GameAuthDecorator()
	@ApiOkResponse({ type: PartidaControllerResponse })
	@ApiConflictResponse({ type: ExceptionResponseDTO })
	async descartar(
		@Body() body: DescartarRequest,
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
	): Promise<PartidaControllerResponse> {
		return this.responder(await this.orquestador.descartar(this.comando(body, user, game), body.carta, body.grupos), user);
	}

	/** Comando intentar cierre de ronda. */
	@Post(PartidaControllerConstants.CERRAR_URL)
	@HttpCode(HttpStatus.OK)
	@GameAuthDecorator()
	@ApiOkResponse({ type: PartidaControllerResponse })
	@ApiConflictResponse({ type: ExceptionResponseDTO })
	async cerrar(
		@Body() body: CerrarRequest,
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
	): Promise<PartidaControllerResponse> {
		const resultado = await this.orquestador.intentarCierre(this.comando(body, user, game), body.tipo ?? 'GANAR_4_3_3', body.grupos, body.descarte);
		return this.responder(resultado, user);
	}

	private partidaDe(game: GameDTO): string {
		if (!game.partidaId) throw new PartidaNotFoundException();
		return game.partidaId;
	}

	private comando(body: ComandoTurnoRequest, user: UserDecoratorType, game: GameDTO): ComandoTurno {
		return { salaId: game.gameId, partidaId: this.partidaDe(game), usuarioId: user.userId, version: body.version, idComando: body.idComando };
	}

	private responder(resultado: ResultadoComando, user: UserDecoratorType): PartidaControllerResponse {
		return Object.assign(new PartidaControllerResponse(), {
			aplicado: resultado.aplicado,
			partida: vistaPublica(resultado.partida),
			mano: vistaPrivada(resultado.partida, user.userId),
		});
	}
}
