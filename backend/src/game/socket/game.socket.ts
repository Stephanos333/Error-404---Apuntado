import {
	ConnectedSocket,
	OnGatewayConnection,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { GameSocketConstants } from './game.socket.constants';
import { Logger, UseFilters } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameAuthDecorator } from '../../security/game-auth.decorator';
import { GameDecorator } from '../../security/game.decorator';
import { Game, GameDTO } from '../../domain/game/game';
import { AppExceptionFilter } from '../../shared/exceptions/app.exception-filter';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { User, UserDTO } from '../../domain/user/user';
import { Player, PlayerDTO } from '../../domain/player/player';
import { PlayerWithUserDTO } from '../../domain/player/player-with-user.dto';
import { Match } from '../../domain/match/match';
import { MatchEvent } from '../../domain/match/match-commands';
import { planNotifications } from './match-notifications';
import { privateRoom, publicRoom } from './rooms';

/**
 * Socket.io websocket that handles the game events.
 *
 * Security (R04): every authenticated client joins two rooms.
 * - `match:{roomId}` (public): only receives public views, never private cards nor the deck.
 * - `user:{userId}` (private): only receives that user's hand.
 * The server is the only authority: this gateway only notifies already confirmed states.
 */
@WebSocketGateway({
	cors: true,
	namespace: GameSocketConstants.GAME_SOCKET_NAMESPACE,
})
export class GameSocket implements OnGatewayInit, OnGatewayConnection {
	@WebSocketServer() wsServer: Server;
	private readonly logger: Logger = new Logger(GameSocket.name);

	/**
	 * Handles the GameSocketConstants.GAME_CONNECTION_EVENT message, where the user
	 * joins the public room of their game and their private room.
	 * @param user The authenticated user (JWT).
	 * @param game The game they belong to (validated by the game guard).
	 * @param socket The connected client.
	 */
	@SubscribeMessage(GameSocketConstants.GAME_CONNECTION_EVENT)
	@UseFilters(AppExceptionFilter)
	@GameAuthDecorator()
	gameConnection(
		@UserDecorator() user: UserDecoratorType,
		@GameDecorator() game: GameDTO,
		@ConnectedSocket() socket: Socket,
	): void {
		this.logger.log(
			`[${this.gameConnection.name}] INIT :: user: ${user.userId}, game: ${game.gameId}, socket: ${socket.id}`,
		);
		socket.join([publicRoom(game.gameId), privateRoom(user.userId)]);
		socket.data.gameId = game.gameId;
		socket.data.userId = user.userId;
	}

	/**
	 * Notifies that a user joined a game.
	 * @param user The user who joined.
	 * @param player The created player.
	 * @param game The joined game.
	 */
	async joinPlayer(user: User, player: Player, game: Game): Promise<void> {
		this.logger.log(
			`[${this.joinPlayer.name}] INIT :: user: ${user.userId.toString()}, game: ${game.gameId.toString()}`,
		);
		const playerDTO: PlayerDTO = await player.toDTO();
		const userDTO: UserDTO = user.toDTO();
		const args: PlayerWithUserDTO = {
			playerId: playerDTO.playerId,
			userId: userDTO.userId,
			username: userDTO.username,
			icon: userDTO.icon,
			isMarked: false,
			status: playerDTO.status,
			position: playerDTO.position,
			score: playerDTO.score,
			isActive: playerDTO.isActive,
			cardDesignId: userDTO.currentDesignId,
			cardDesignName: userDTO.currentDesignName,
		};
		this.wsServer.to(publicRoom(game.gameId.toString())).emit(GameSocketConstants.JOIN_PLAYER_LISTENER, args);
		this.logger.log(`[${this.joinPlayer.name}] FINISH ::`);
	}

	/**
	 * Notifies that a game is ready to start.
	 * @param game The game that is ready to start.
	 */
	gameReadyToStart(game: Game): void {
		this.logger.log(`[${this.gameReadyToStart.name}] INIT :: game: ${game.gameId.toString()}`);
		const gameDTO: GameDTO = game.toDTO();
		this.wsServer.to(publicRoom(gameDTO.gameId)).emit(GameSocketConstants.GAME_READY_TO_START_LISTENER, gameDTO);
		this.logger.log(`[${this.gameReadyToStart.name}] FINISH ::`);
	}

	/**
	 * Notifies a confirmed match command: the public view to the table room and the hand
	 * of each affected player to their private room. It replaces the old `MATCH_STARTED`
	 * (which sent the whole deck) and `SHIFT_CHANGED` (which sent the next player's hand
	 * to the whole room).
	 * @param {string} roomId The id of the game (room).
	 * @param {Match} match The confirmed state.
	 * @param {ReadonlyArray<MatchEvent>} events The events of the command.
	 */
	notifyMatch(roomId: string, match: Match, events: ReadonlyArray<MatchEvent>): void {
		for (const delivery of planNotifications(roomId, match, events)) {
			this.wsServer.to(delivery.room).emit(delivery.message, delivery.content);
		}
		this.logger.log(`[${this.notifyMatch.name}] match: ${match._id} version: ${match.version}`);
	}

	/**
	 * Runs when the websocket is initialized.
	 */
	afterInit(): void {
		this.logger.log(`[${this.afterInit.name}] ${GameSocketConstants.GAME_SOCKET_NAMESPACE} Socket initialized.`);
	}

	/**
	 * Runs when a websocket connects.
	 * @param client The connected client.
	 */
	handleConnection(client: Socket): void {
		this.logger.log(`[${this.handleConnection.name}] Socket connected : ${client.id}`);
	}
}
