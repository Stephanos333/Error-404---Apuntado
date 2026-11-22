import { Inject, Injectable, Logger } from '@nestjs/common';
import { DatabaseConstants } from '../../database/database.constants';
import { Model, PipelineStage } from 'mongoose';
import { PlayerDocument } from '../../database/player.schema';
import { Player, PlayerDTO } from '../../dominio/player/player';
import { UserId } from '../../dominio/user/user-id';
import { GameId } from '../../dominio/game/game-id';
import { UserIsAlreadyPlayingException } from '../../dominio/user/exceptions/user-is-already-playing.exception';
import { PlayerNotFoundException } from '../../dominio/player/exceptions/player-not-found.exception';
import { PlayerId } from '../../dominio/player/player-id';
import { PlayerStatusConstants } from '../../dominio/player/player-status.constants';
import { PlayerWithUserDTO } from '../../dominio/player/player-with-user.dto';
import { PlayerQueries } from './player.queries';

/**
 * Los servicios asociados a los jugadores como miembros de una sala.
 *
 * Desde el E3 el estado de juego (manos, turno, puntajes) vive en el agregado `partidas`
 * y lo modifica únicamente el `TurnOrchestrator` (ADR-04/ADR-05). Este servicio solo
 * gestiona la membresía de los jugadores en el juego.
 */
@Injectable()
export class PlayerService {
	private readonly logger: Logger = new Logger(PlayerService.name);

	/**
	 * @param {Model<PlayerDocument>} model Modelo para interactuar con la
	 * base de datos de los jugadores.
	 */
	constructor(@Inject(DatabaseConstants.PLAYER_PROVIDER) private readonly model: Model<PlayerDocument>) {}

	/**
	 * Función que permite crear un jugador.
	 * @param {UserId} userId El id del usuario.
	 * @param {GameId} gameId El juego al que se asocia el jugador.
	 * @param {boolean} [validateUser=true] Determina si se debe validar el usuario.
	 * @returns {Player} El usuario creado.
	 */
	async create(userId: UserId, gameId: GameId, validateUser: boolean = true): Promise<Player> {
		this.logger.log(`[${this.create.name}] INIT :: userId: ${userId.toString()}, gameId: ${gameId.toString()}`);
		if (validateUser && (await this.getActiveByUserId(userId, false))) throw new UserIsAlreadyPlayingException();
		const player: Player = await Player.fromDTO({
			gameId: gameId.toString(),
			isActive: true,
			playerId: PlayerId.create(),
			status: PlayerStatusConstants.WAITING_GAME,
			userId: userId.toString(),
			triedToWin: false,
		});
		await new this.model(await player.toDTO()).save();
		this.logger.log(`[${this.create.name}] FINISH ::`);
		return player;
	}

	/**
	 * Actualiza los datos de un jugador.
	 * @param {Player} player El jugador que será actualizado.
	 */
	async update(player: Player): Promise<void> {
		this.logger.log(`[${this.update.name}] INIT :: id: ${player.playerId.toString()}`);
		const { playerId, ...toUpdate } = await player.toDTO();
		await this.model.updateOne({ playerId }, toUpdate);
		this.logger.log(`[${this.update.name}] FINISH ::`);
	}

	/**
	 * Elimina un jugador de la base de datos (por ejemplo, al abandonar sala de espera).
	 * @param {PlayerId} playerId El jugador a eliminar.
	 */
	async delete(playerId: PlayerId): Promise<void> {
		this.logger.log(`[${this.delete.name}] INIT :: id: ${playerId.toString()}`);
		await this.model.deleteOne({ playerId: playerId.toString() });
		this.logger.log(`[${this.delete.name}] FINISH ::`);
	}

	/**
	 * Elimina todos los jugadores de un juego (por ejemplo, al cancelar sala de espera).
	 * @param {GameId} gameId El juego cuyos jugadores se eliminarán.
	 */
	async deleteByGame(gameId: GameId): Promise<void> {
		this.logger.log(`[${this.deleteByGame.name}] INIT :: gameId: ${gameId.toString()}`);
		await this.model.deleteMany({ gameId: gameId.toString() });
		this.logger.log(`[${this.deleteByGame.name}] FINISH ::`);
	}

	/**
	 * Función que permite buscar un jugador por su userId y validar su existencia.
	 * @param {UserId} userId El jugador que se solicita.
	 * @param {boolean} [throwExceptionIfNotFound=true] Bandera para determinar si se debe lanzar
	 * una excepción cuando el jugador solicitado no existe.
	 * @returns {Promise<Player | undefined>} Se retorna el jugador solicitado cuando se encuentra,
	 * si la bandera throwExceptionIfNotFound=false y el jugador solicitado no existe se retorna undefined.
	 * @throws {PlayerNotFoundException} Se lanza cuando la bandera throwExceptionIfNotFound=true y el jugador solicitado
	 * no existe.
	 */
	async getActiveByUserId(userId: UserId, throwExceptionIfNotFound: boolean = true): Promise<Player | undefined> {
		this.logger.log(`[${this.getActiveByUserId.name}] INIT :: userId: ${userId.toString()}`);
		const found: PlayerDTO = await this.model.findOne({ userId: userId.toString(), isActive: true });
		const mapped: Player = found ? await Player.fromDTO(found) : undefined;
		if (throwExceptionIfNotFound && !mapped) throw new PlayerNotFoundException();
		this.logger.log(`[${this.getActiveByUserId.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Función que permite buscar todos los participantes de un juego.
	 * @param {GameId} gameId El juego solicitado.
	 * @returns {Promise<Player[]>} Los jugadores encontrados.
	 */
	async getByGame(gameId: GameId): Promise<Player[]> {
		this.logger.log(`[${this.getByGame.name}] INIT :: game: ${gameId?.toString()}`);
		const found: PlayerDocument[] = await this.model.find({ gameId: gameId.toString() });
		const mapped: Player[] = await Promise.all(found.map((p) => Player.fromDTO(p)));
		this.logger.log(`[${this.getByGame.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Función que permite buscar los participantes de un juego con la
	 * información de sus usuarios.
	 * @param {GameId} gameId El juego solicitado.
	 * @param {UserId} userId El usuario que ejecuta el servicio.
	 * @returns {Promise<Array<PlayerWithUserDTO>>} Los jugadores encontrados.
	 */
	async getWithUserByGame(gameId: GameId, userId: UserId): Promise<PlayerWithUserDTO[]> {
		this.logger.log(`[${this.getWithUserByGame.name}] INIT :: gameId: ${gameId.toString()}`);
		const query: Array<PipelineStage> = PlayerQueries.getWithUserByGame(gameId);
		const aggregateResponse: Array<PlayerWithUserDTO & { _id: string }> = await this.model.aggregate(query);
		const mapped: Array<PlayerWithUserDTO> = await Promise.all(
			aggregateResponse.map(async (e): Promise<PlayerWithUserDTO> => {
				return {
					cardDesignId: e.cardDesignId,
					cardDesignName: e.cardDesignName,
					icon: e.icon,
					isActive: e.isActive,
					playerId: e.playerId,
					position: e.position,
					score: e.score,
					status: e.status,
					userId: e.userId,
					username: e.username,
					isMarked: userId.toString() === e.userId,
				};
			}),
		);
		this.logger.log(`[${this.getWithUserByGame.name}] FINISH ::`);
		return mapped;
	}
}
