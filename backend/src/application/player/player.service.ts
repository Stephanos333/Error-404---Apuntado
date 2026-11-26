import { Inject, Injectable, Logger } from '@nestjs/common';
import { DatabaseConstants } from '../../database/database.constants';
import { Model, PipelineStage } from 'mongoose';
import { PlayerDocument } from '../../database/player.schema';
import { Player, PlayerDTO } from '../../domain/player/player';
import { UserId } from '../../domain/user/user-id';
import { GameId } from '../../domain/game/game-id';
import { UserIsAlreadyPlayingException } from '../../domain/user/exceptions/user-is-already-playing.exception';
import { PlayerNotFoundException } from '../../domain/player/exceptions/player-not-found.exception';
import { PlayerId } from '../../domain/player/player-id';
import { PlayerStatusConstants } from '../../domain/player/player-status.constants';
import { PlayerWithUserDTO } from '../../domain/player/player-with-user.dto';
import { PlayerQueries } from './player.queries';

/**
 * Services for the players as members of a room.
 *
 * Since D3 the game state (hands, turn, scores) lives in the `matches` aggregate and only
 * the `TurnOrchestrator` changes it (ADR-04/ADR-05). This service only manages the
 * membership of the players in the game.
 */
@Injectable()
export class PlayerService {
	private readonly logger: Logger = new Logger(PlayerService.name);

	/**
	 * @param {Model<PlayerDocument>} model Model to interact with the
	 * players database.
	 */
	constructor(@Inject(DatabaseConstants.PLAYER_PROVIDER) private readonly model: Model<PlayerDocument>) {}

	/**
	 * Creates a player.
	 * @param {UserId} userId The id of the user.
	 * @param {GameId} gameId The game the player belongs to.
	 * @param {boolean} [validateUser=true] Whether the user must be validated.
	 * @returns {Player} The created player.
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
	 * Updates the data of a player.
	 * @param {Player} player The player to update.
	 */
	async update(player: Player): Promise<void> {
		this.logger.log(`[${this.update.name}] INIT :: id: ${player.playerId.toString()}`);
		const { playerId, ...toUpdate } = await player.toDTO();
		await this.model.updateOne({ playerId }, toUpdate);
		this.logger.log(`[${this.update.name}] FINISH ::`);
	}

	/**
	 * Deletes a player from the database (for example, when leaving a waiting room).
	 * @param {PlayerId} playerId The player to delete.
	 */
	async delete(playerId: PlayerId): Promise<void> {
		this.logger.log(`[${this.delete.name}] INIT :: id: ${playerId.toString()}`);
		await this.model.deleteOne({ playerId: playerId.toString() });
		this.logger.log(`[${this.delete.name}] FINISH ::`);
	}

	/**
	 * Deletes every player of a game (for example, when cancelling a waiting room).
	 * @param {GameId} gameId The game whose players will be deleted.
	 */
	async deleteByGame(gameId: GameId): Promise<void> {
		this.logger.log(`[${this.deleteByGame.name}] INIT :: gameId: ${gameId.toString()}`);
		await this.model.deleteMany({ gameId: gameId.toString() });
		this.logger.log(`[${this.deleteByGame.name}] FINISH ::`);
	}

	/**
	 * Finds a player by userId and validates that it exists.
	 * @param {UserId} userId The requested player.
	 * @param {boolean} [throwExceptionIfNotFound=true] Whether an exception must be thrown
	 * when the requested player does not exist.
	 * @returns {Promise<Player | undefined>} The requested player when found; when
	 * throwExceptionIfNotFound=false and the player does not exist, undefined.
	 * @throws {PlayerNotFoundException} When throwExceptionIfNotFound=true and the requested player
	 * does not exist.
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
	 * Finds every participant of a game.
	 * @param {GameId} gameId The requested game.
	 * @returns {Promise<Player[]>} The players found.
	 */
	async getByGame(gameId: GameId): Promise<Player[]> {
		this.logger.log(`[${this.getByGame.name}] INIT :: game: ${gameId?.toString()}`);
		const found: PlayerDocument[] = await this.model.find({ gameId: gameId.toString() });
		const mapped: Player[] = await Promise.all(found.map((p) => Player.fromDTO(p)));
		this.logger.log(`[${this.getByGame.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Finds the participants of a game with the information
	 * of their users.
	 * @param {GameId} gameId The requested game.
	 * @param {UserId} userId The user running the service.
	 * @returns {Promise<Array<PlayerWithUserDTO>>} The players found.
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
