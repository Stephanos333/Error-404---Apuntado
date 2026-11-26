import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GameAuthDecorator } from '../../security/game-auth.decorator';
import { GameDecorator } from '../../security/game.decorator';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { GameDTO } from '../../domain/game/game';
import { privateView, publicView } from '../../domain/match/match-views';
import { MatchNotFoundException } from '../../domain/match/match.exceptions';
import { ExceptionResponseDTO } from '../../shared/exceptions/exception.response';
import { TurnCommand, CommandResult, TurnOrchestrator } from '../../application/match/turn-orchestrator.service';
import { MatchPlayControllerConstants } from './match-play.controller.constants';
import { CloseRequest, TurnCommandRequest, DiscardRequest, DrawRequest } from './requests/turn-command.request';
import { MatchPlayControllerResponse } from './responses/match-play.controller.response';

/**
 * Entry points of the turn commands on the `matches` aggregate (ADR-04/05).
 *
 * The match is resolved from the current game of the authenticated user (game guard):
 * a player cannot act on someone else's match. A command that loses the race answers
 * 409 with `ROUND_ALREADY_CLOSED`, `NOT_YOUR_TURN` or `STALE_VERSION`.
 * @class
 */
@Controller(MatchPlayControllerConstants.CONTROLLER_PREFIX)
@ApiTags(MatchPlayControllerConstants.CONTROLLER_TAG)
export class MatchPlayController {
	/**
	 * @param {TurnOrchestrator} orchestrator The turn orchestrator.
	 */
	constructor(private readonly orchestrator: TurnOrchestrator) {}

	/**
	 * Current state of the user's match (RF-14): to reconnect or after a version jump.
	 */
	@Get(MatchPlayControllerConstants.STATE_URL)
	@GameAuthDecorator()
	@ApiOkResponse({ type: MatchPlayControllerResponse })
	@ApiResponse({ type: ExceptionResponseDTO })
	async state(@UserDecorator() user: UserDecoratorType, @GameDecorator() game: GameDTO): Promise<MatchPlayControllerResponse> {
		const state = await this.orchestrator.getState(this.matchOf(game), user.userId);
		return Object.assign(new MatchPlayControllerResponse(), { applied: false, match: state.publicView, hand: state.privateView });
	}

	/** Comando robar. */
	@Post(MatchPlayControllerConstants.DRAW_URL)
	@HttpCode(HttpStatus.OK)
	@GameAuthDecorator()
	@ApiOkResponse({ type: MatchPlayControllerResponse })
	@ApiConflictResponse({ type: ExceptionResponseDTO })
	async draw(
		@Body() body: DrawRequest,
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
	): Promise<MatchPlayControllerResponse> {
		return this.respond(await this.orchestrator.draw(this.command(body, user, game), body.source), user);
	}

	/** Comando descartar. */
	@Post(MatchPlayControllerConstants.DISCARD_URL)
	@HttpCode(HttpStatus.OK)
	@GameAuthDecorator()
	@ApiOkResponse({ type: MatchPlayControllerResponse })
	@ApiConflictResponse({ type: ExceptionResponseDTO })
	async discard(
		@Body() body: DiscardRequest,
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
	): Promise<MatchPlayControllerResponse> {
		return this.respond(await this.orchestrator.discard(this.command(body, user, game), body.card, body.groups), user);
	}

	/** Attempt-to-close-the-round command. */
	@Post(MatchPlayControllerConstants.CLOSE_URL)
	@HttpCode(HttpStatus.OK)
	@GameAuthDecorator()
	@ApiOkResponse({ type: MatchPlayControllerResponse })
	@ApiConflictResponse({ type: ExceptionResponseDTO })
	async close(
		@Body() body: CloseRequest,
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
	): Promise<MatchPlayControllerResponse> {
		const result = await this.orchestrator.attemptClose(this.command(body, user, game), body.type ?? 'WIN_4_3_3', body.groups, body.discard);
		return this.respond(result, user);
	}

	private matchOf(game: GameDTO): string {
		if (!game.matchId) throw new MatchNotFoundException();
		return game.matchId;
	}

	private command(body: TurnCommandRequest, user: UserDecoratorType, game: GameDTO): TurnCommand {
		return { roomId: game.gameId, matchId: this.matchOf(game), userId: user.userId, version: body.version, commandId: body.commandId };
	}

	private respond(result: CommandResult, user: UserDecoratorType): MatchPlayControllerResponse {
		return Object.assign(new MatchPlayControllerResponse(), {
			applied: result.applied,
			match: publicView(result.match),
			hand: privateView(result.match, user.userId),
		});
	}
}
