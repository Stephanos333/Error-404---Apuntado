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
import { Game, GameDTO } from '../../dominio/game/game';
import { AppExceptionFilter } from '../../shared/exceptions/app.exception-filter';
import { UserDecorator, UserDecoratorType } from '../../security/user.decorator';
import { User, UserDTO } from '../../dominio/user/user';
import { Player, PlayerDTO } from '../../dominio/player/player';
import { PlayerWithUserDTO } from '../../dominio/player/player-with-user.dto';
import { Partida } from '../../dominio/partida/partida';
import { EventoPartida } from '../../dominio/partida/comandos-partida';
import { planificarNotificaciones } from './notificaciones-partida';
import { salaPrivada, salaPublica } from './salas';

/**
 * Websocket con socket.io para manejar los eventos de los juegos.
 *
 * Seguridad (R04): cada cliente autenticado se une a dos salas.
 * - `partida:{salaId}` (pública): solo recibe vistas públicas, nunca cartas privadas ni el mazo.
 * - `usuario:{userId}` (privada): solo recibe la mano de ese usuario.
 * El servidor es la única autoridad: este gateway solo notifica estados ya confirmados.
 */
@WebSocketGateway({
	cors: true,
	namespace: GameSocketConstants.GAME_SOCKET_NAMESPACE,
})
export class GameSocket implements OnGatewayInit, OnGatewayConnection {
	@WebSocketServer() wsServer: Server;
	private readonly logger: Logger = new Logger(GameSocket.name);

	/**
	 * Evento que captura el mensaje GameSocketConstants.GAME_CONNECTION_EVENT en dónde
	 * se une al usuario a la sala pública de su juego y a su sala privada.
	 * @param user El usuario autenticado (JWT).
	 * @param game El juego al que pertenece (validado por la guardia del juego).
	 * @param socket El cliente conectado.
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
		socket.join([salaPublica(game.gameId), salaPrivada(user.userId)]);
		socket.data.gameId = game.gameId;
		socket.data.userId = user.userId;
	}

	/**
	 * Función que notifica que un usuario ingresó a un juego.
	 * @param user El usuario ingresado.
	 * @param player El jugador generado.
	 * @param game El juego al que ingresó.
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
		this.wsServer.to(salaPublica(game.gameId.toString())).emit(GameSocketConstants.JOIN_PLAYER_LISTENER, args);
		this.logger.log(`[${this.joinPlayer.name}] FINISH ::`);
	}

	/**
	 * Función que notifica que un juego está listo para iniciar.
	 * @param game El juego que está listo para iniciar.
	 */
	gameReadyToStart(game: Game): void {
		this.logger.log(`[${this.gameReadyToStart.name}] INIT :: game: ${game.gameId.toString()}`);
		const gameDTO: GameDTO = game.toDTO();
		this.wsServer.to(salaPublica(gameDTO.gameId)).emit(GameSocketConstants.GAME_READY_TO_START_LISTENER, gameDTO);
		this.logger.log(`[${this.gameReadyToStart.name}] FINISH ::`);
	}

	/**
	 * Notifica un comando confirmado de la partida: vista pública a la sala de la mesa y
	 * la mano de cada jugador afectado a su sala privada. Reemplaza los antiguos
	 * `MATCH_STARTED` (que enviaba el mazo completo) y `SHIFT_CHANGED` (que enviaba la mano
	 * del siguiente jugador a toda la sala).
	 * @param {string} salaId El id del juego (sala).
	 * @param {Partida} partida El estado confirmado.
	 * @param {ReadonlyArray<EventoPartida>} eventos Los eventos del comando.
	 */
	notificarPartida(salaId: string, partida: Partida, eventos: ReadonlyArray<EventoPartida>): void {
		for (const envio of planificarNotificaciones(salaId, partida, eventos)) {
			this.wsServer.to(envio.sala).emit(envio.mensaje, envio.contenido);
		}
		this.logger.log(`[${this.notificarPartida.name}] partida: ${partida._id} version: ${partida.version}`);
	}

	/**
	 * Evento que se ejecuta cuando se inicializa el websocket.
	 */
	afterInit(): void {
		this.logger.log(`[${this.afterInit.name}] ${GameSocketConstants.GAME_SOCKET_NAMESPACE} Socket initialized.`);
	}

	/**
	 * Evento que se ejecuta cuando se conecta un websocket.
	 * @param client El cliente conectado.
	 */
	handleConnection(client: Socket): void {
		this.logger.log(`[${this.handleConnection.name}] Socket connected : ${client.id}`);
	}
}
