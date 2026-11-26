import { Inject, Injectable, Logger } from '@nestjs/common';
import { DatabaseConstants } from '../../database/database.constants';
import { Model } from 'mongoose';
import { GameDocument } from '../../database/game.schema';
import { Game, GameDTO } from '../../domain/game/game';
import { UserId } from '../../domain/user/user-id';
import { UserService } from '../user/user.service';
import { User } from '../../domain/user/user';
import { UserStatusConstants } from '../../domain/user/user-status.constants';
import { InvalidGameRequiredPlayersException } from '../../domain/game/exceptions/invalid-game-required-players.exception';
import { GameId } from '../../domain/game/game-id';
import { GameStatusConstants } from '../../domain/game/game-status.constants';
import { PlayerService } from '../player/player.service';
import { Player } from '../../domain/player/player';
import { GameIsAlreadyFinishedException } from '../../domain/game/exceptions/game-is-already-finished.exception';
import { GameNotFoundException } from '../../domain/game/exceptions/game-not-found.exception';
import { GameIsAlreadyStartedException } from '../../domain/game/exceptions/game-is-already-started.exception';
import { GameExceedsItsPlayerCountException } from '../../domain/game/exceptions/game-exceeds-its-player-count.exception';
import { GameNotUpdatedException } from '../../domain/game/exceptions/game-not-updated.exception';
import { EventBus } from '@nestjs/cqrs';
import { PlayerJoinGameEvent } from '../../domain/events/player/player-join-game/player-join-game.event';
import { GameReadyToStartEvent } from '../../domain/events/game-ready-to-start/game-ready-to-start.event';
import { InvalidGameRuleException } from '../../domain/game/exceptions/invalid-game-rule.exception';
import { RuleRegistry } from '../../rules/registry/rule-registry';

/**
 * Class with the services to interact with the
 * games of the system.
 * @class
 */
@Injectable()
export class GameService {

	private readonly logger: Logger = new Logger(GameService.name);

	/**
	 * @param {UserService} userService Services to interact with the users.
	 * @param {PlayerService} playerService Services to interact with the players.
	 * @param {EventBus} eventBus CQRS bus used to send events.
	 * @param {RuleRegistry} ruleRegistry Registry of the rule plug-ins.
	 * @param {Model<GameDocument>} model Model to interact with the games
	 * database.
	 */
	constructor(
		private readonly userService: UserService,
		private readonly playerService: PlayerService,
		private readonly eventBus: EventBus,
		private readonly ruleRegistry: RuleRegistry,
		@Inject(DatabaseConstants.GAME_PROVIDER) private readonly model: Model<GameDocument>,
	) {
	}

	/**
	 * Creates a game.
	 * @param request Data required to create a game.
	 * @param {UserId} request.creatorId The creator of the game.
	 * @param {number} request.requiredPlayers The number of players required to start
	 * the game.
	 * @param {boolean} request.isPublic Whether the game is public.
	 * @param {number} request.betByPlayer The number of tokens each player must bet.
	 * @param {string} request.name The name of the game.
	 * @param {string} [request.ruleId] The id of the rule plug-in; the default one is used when omitted.
	 * @throws {InvalidGameRequiredPlayersException} When the "requiredPlayers" value
	 * does not meet the requirements of the system.
	 * @throws {InvalidGameRuleException} When the requested rule is not registered.
	 * @returns {Promise<Game>} The created game.
	 */
	async create(
		request: {
			creatorId: UserId,
			requiredPlayers: number,
			isPublic: boolean,
			betByPlayer: number,
			name: string,
			ruleId?: string,
		},
	): Promise<Game> {
		this.logger.log(`[${this.create.name}] INIT :: request: ${JSON.stringify(request)}`);
		const { requiredPlayers } = request;
		const ruleId: string = this.resolveRuleId(request.ruleId);
		const user: User = await this.userService.getById(request.creatorId);
		user.changeStatus(UserStatusConstants.PLAYING);
		// The bet is validated here and charged when the match starts (TurnOrchestrator, ADR-04 transaction).
		user.ensureEnoughTokens(request.betByPlayer);
		if (requiredPlayers < 2 || requiredPlayers > 6) throw new InvalidGameRequiredPlayersException();
		const game: Game = Game.fromDTO({
			creatorId: request.creatorId.toString(),
			hostId: request.creatorId.toString(),
			gameId: GameId.create(),
			status: GameStatusConstants.WAITING_PLAYERS,
			requiredPlayers: requiredPlayers,
			currentPlayers: 1,
			betByPlayer: request.betByPlayer,
			isPublic: request.isPublic,
			name: request.name,
			wasInitiated: false,
			ruleId,
		});
		await new this.model(game.toDTO()).save();
		await this.playerService.create(request.creatorId, game.gameId, false);
		await this.userService.update(user);
		this.logger.log(`[${this.create.name}] FINISH ::`);
		return game;
	}

	/**
	 * Determines the rule the game will be played with. The rule is frozen in the game (ADR-03).
	 * @param {string} [ruleId] The requested id; the default rule is used when omitted.
	 * @returns {string} The id of the registered rule.
	 * @throws {InvalidGameRuleException} When the requested rule is not registered.
	 * @private
	 */
	private resolveRuleId(ruleId?: string): string {
		if (ruleId !== undefined && !this.ruleRegistry.exists(ruleId)) throw new InvalidGameRuleException();
		return this.ruleRegistry.get(ruleId).descriptor.id;
	}

	/**
	 * Finds a game by its ID and validates that it exists.
	 * @param {GameId} gameId The requested game.
	 * @param {boolean} [throwExceptionIfNotFound=true] Whether an exception must be thrown
	 * when the requested game does not exist.
	 * @returns {Promise<Player | undefined>} The requested game when found; when
	 * throwExceptionIfNotFound=false and the game does not exist, undefined.
	 * @throws {GameNotFoundException} When throwExceptionIfNotFound=true
	 * and the requested game does not exist.
	 */
	async getById(gameId: GameId, throwExceptionIfNotFound: boolean = true): Promise<Game | undefined> {
		this.logger.log(`[${this.getById.name}] INIT :: gameId: ${gameId.toString()}`);
		const found: GameDTO = await this.model.findOne({ gameId: gameId.toString() });
		const mapped: Game = found ? Game.fromDTO(found) : undefined;
		if (throwExceptionIfNotFound && !mapped) throw new GameNotFoundException();
		this.logger.log(`[${this.getById.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Finds a game through one of its players.
	 * @param {UserId} userId The user of the player.
	 * @returns {Promise<Game>} The game found.
	 */
	async getNotFinishedByPlayer(userId: UserId): Promise<Game> {
		this.logger.log(`[${this.getNotFinishedByPlayer.name}] INIT :: userId: ${userId.toString()}`);
		const player: Player = await this.playerService.getActiveByUserId(userId);
		const game: Game = await this.getById(player.gameId);
		if (game.status.is(GameStatusConstants.FINISHED)) throw new GameIsAlreadyFinishedException();
		this.logger.log(`[${this.getNotFinishedByPlayer.name}] FINISH ::`);
		return game;
	}

	/**
	 * Fetches every public game.
	 * @returns {Array<Game>} Every available public game.
	 */
	async getPublicAndEmpty(): Promise<Array<Game>> {
		this.logger.log(`[${this.getPublicAndEmpty.name}] INIT ::`);
		// TODO: Improve the logic of this method with pagination.
		const found: Array<GameDTO> = await this.model.find({
			isPublic: true,
			status: GameStatusConstants.WAITING_PLAYERS,
		});
		const mapped: Array<Game> = await Promise.all(found.map(async (g) => Game.fromDTO(g)));
		this.logger.log(`[${this.getPublicAndEmpty.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Lets a user join a game.
	 * @param {GameId} gameId The game to join.
	 * @param {UserId} userId The user who wants to join.
	 * @returns {Game} The joined game.
	 * @throws {GameIsAlreadyStartedException} When trying to join a game that has already
	 * started.
	 * @throws {GameExceedsItsPlayerCountException} When the game has not started
	 * but is already full.
	 */
	async join(gameId: GameId, userId: UserId): Promise<Game> {
		this.logger.log(`[${this.join.name}] INIT :: gameId: ${gameId.toString()}, userId: ${userId.toString()}`);
		const game: Game = await this.getById(gameId);
		if (game.wasInitiated) throw new GameIsAlreadyStartedException();
		if (game.status.is(GameStatusConstants.WAITING_TO_START)) throw new GameExceedsItsPlayerCountException();
		const user: User = await this.userService.getById(userId);
		user.changeStatus(UserStatusConstants.PLAYING);
		// The bet is validated here and charged when the match starts (TurnOrchestrator, ADR-04 transaction).
		user.ensureEnoughTokens(game.betByPlayer);
		const player: Player = await this.playerService.create(userId, gameId, false);
		await this.userService.update(user);
		game.addPlayer();
		const updated: Game = await this.update(game);
		this.eventBus.publish(new PlayerJoinGameEvent(user, player, game));
		this.eventBus.publish(new GameReadyToStartEvent(game));
		this.logger.log(`[${this.join.name}] FINISH ::`);
		return updated;
	}

	/**
	 * Updates all the information of a game.
	 * @param {Game} game The game being updated.
	 * @returns {Promise<Game>} The updated game.
	 * @throws {GameNotUpdatedException} When the update request
	 * could not be performed.
	 */
	async update(game: Game): Promise<Game> {
		this.logger.log(`[${this.update.name}] INIT ::`);
		const updated: GameDTO = await this.model.findOneAndUpdate(
			{ gameId: game.gameId.toString() },
			game.toDTO(),
			{ new: true },
		);
		const mapped: Game = updated ? Game.fromDTO(updated) : undefined;
		if (!mapped) throw new GameNotUpdatedException();
		this.logger.log(`[${this.update.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Lets a user cancel or leave a waiting room,
	 * releasing their status to ACTIVE and cleaning up the pending records.
	 * @param {UserId} userId The user who asks to leave or cancel.
	 * @returns {Promise<{ message: string }>} Confirmation message.
	 */
	async leaveOrCancel(userId: UserId): Promise<{ message: string }> {
		this.logger.log(`[${this.leaveOrCancel.name}] INIT :: userId: ${userId.toString()}`);
		const user = await this.userService.getById(userId);
		const player = await this.playerService.getActiveByUserId(userId, false);

		if (!player) {
			await this.releaseUserToActive(user);
			return { message: 'User released successfully.' };
		}

		const game = await this.findPendingGame(player.gameId.toString());
		if (game && !game.wasInitiated) {
			const isHost = game.creatorId.toString() === userId.toString() || game.hostId.toString() === userId.toString();
			if (isHost) {
				await this.cancelGameAsHost(game);
			} else {
				await this.leaveGameAsGuest(game, player, user);
			}
		} else {
			await this.cleanupOrphanPlayer(player, user);
		}

		this.logger.log(`[${this.leaveOrCancel.name}] FINISH ::`);
		return { message: 'Match cancelled or left successfully.' };
	}

	private async findPendingGame(gameIdStr: string): Promise<Game | undefined> {
		try {
			return await this.getById(new GameId(gameIdStr), false);
		} catch {
			return undefined;
		}
	}

	private async releaseUserToActive(user: User): Promise<void> {
		if (user.status.is(UserStatusConstants.PLAYING)) {
			user.changeStatus(UserStatusConstants.ACTIVE);
			await this.userService.update(user);
		}
	}

	private async cancelGameAsHost(game: Game): Promise<void> {
		const allPlayers = await this.playerService.getByGame(game.gameId);
		for (const p of allPlayers) {
			try {
				const u = await this.userService.getById(p.userId);
				await this.releaseUserToActive(u);
			} catch (e) {
				this.logger.warn(`Could not update the status of user ${p.userId.toString()}: ${e}`);
			}
		}
		await this.playerService.deleteByGame(game.gameId);
		await this.model.deleteOne({ gameId: game.gameId.toString() });
		this.logger.log(`[leaveOrCancel] Room ${game.gameId.toString()} cancelled by the host.`);
	}

	private async leaveGameAsGuest(game: Game, player: Player, user: User): Promise<void> {
		await this.playerService.delete(player.playerId);
		await this.releaseUserToActive(user);
		game.removePlayer();
		await this.update(game);
		this.logger.log(`[leaveOrCancel] Player ${user.userId.toString()} left the room.`);
	}

	private async cleanupOrphanPlayer(player: Player, user: User): Promise<void> {
		await this.playerService.delete(player.playerId);
		await this.releaseUserToActive(user);
	}
}