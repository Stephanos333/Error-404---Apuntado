import { CanActivate, ContextType, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { GameService } from '../../application/game/game.service';
import { Game } from '../../domain/game/game';
import { UserIsNotPartOfAGameException } from '../../domain/user/exceptions/user-is-not-part-of-a-game.exception';
import { Socket } from 'socket.io';
import { UserDecoratorType } from '../user.decorator';
import { UserId } from '../../domain/user/user-id';

/**
 * Methods of the game guard.
 * @class
 * @implements CanActivate
 */
@Injectable()
export class GameGuard implements CanActivate {

	private readonly logger: Logger = new Logger(GameGuard.name);

	/**
	 * @param {GameService} gameService The services to interact with the games.
	 */
	constructor(private readonly gameService: GameService) {
	}

	/**
	 * Logic of the game guard.
	 * @param {ExecutionContext} context The context the guard runs in.
	 * @returns {boolean} Always true when the game resources can be accessed.
	 * @throws {UserIsNotPartOfAGameException} When a user has no
	 * access to the game resources.
	 */
	async canActivate(context: ExecutionContext): Promise<boolean> {
		try {
			switch (context.getType<ContextType>()) {
			case 'http': {
				const request = context.switchToHttp().getRequest();
				const user: UserDecoratorType = request.user;
				const game: Game = await this.gameService.getNotFinishedByPlayer(new UserId(user.userId));
				request.game = game.toDTO();
				break;
			}
			case 'ws': {
				const socket: Socket = context.switchToWs().getClient();
				const user: UserDecoratorType = JSON.parse(socket.handshake.query.user as string);
				const game: Game = await this.gameService.getNotFinishedByPlayer(new UserId(user.userId));
				socket.handshake.query.game = JSON.stringify(game.toDTO());
			}
			}
			return true;
		} catch (e) {
			this.logger.error(`[${this.canActivate.name}] Error :: ${e.message}`);
			throw new UserIsNotPartOfAGameException();
		}
	}

}