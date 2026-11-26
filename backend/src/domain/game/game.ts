import { ApiProperty } from '@nestjs/swagger';
import { DomainBase } from '../../shared/domain.base';
import { GameId } from './game-id';
import { UserId } from '../user/user-id';
import { GameStatus } from './game-status';
import { GameStatusConstants } from './game-status.constants';
import { GameIsAlreadyStartedException } from './exceptions/game-is-already-started.exception';
import { GameCannotBeStartedException } from './exceptions/game-cannot-be-started.exception';

/**
 * Transfer object of a game.
 * @class
 */
export class GameDTO {
	@ApiProperty() gameId: string;
	@ApiProperty() creatorId: string;
	@ApiProperty() hostId: string;
	@ApiProperty() status: string;
	@ApiProperty() name: string;
	@ApiProperty() requiredPlayers: number;
	@ApiProperty() currentPlayers: number;
	@ApiProperty() betByPlayer: number;
	@ApiProperty() isPublic: boolean;
	@ApiProperty() wasInitiated: boolean;
	@ApiProperty({ required: false, description: '_id of the matches aggregate created when the game starts (ADR-04).' }) matchId?: string;
	@ApiProperty({ required: false, description: 'Id of the rule plug-in frozen when the game is created (ADR-03).' }) ruleId?: string;
}

/**
 * A game and its available actions.
 *
 * @class
 * @extends {DomainBase<GameDTO>}
 */
export class Game extends DomainBase<GameDTO> {

	public readonly gameId: GameId;
	public readonly status: GameStatus;
	public readonly betByPlayer: number;
	public readonly creatorId: UserId;
	private readonly _hostId: UserId;
	private readonly name: string;
	private readonly requiredPlayers: number;
	private readonly isPublic: boolean;
	/** Id of the rule plug-in the game is played with; it is frozen when the game is created. */
	public readonly ruleId?: string;

	/**
	 * @param {GameId} gameId The ID of the game.
	 * @param {UserId} creatorId The ID of the creator of the game.
	 * @param {UserId} hostId The ID of the host of the game.
	 * @param {GameStatus} status The status of the game.
	 * @param {string} name The name of the game.
	 * @param {number} requiredPlayers The total number of players required
	 * to start the game.
	 * @param {number} currentPlayers The current number of players.
	 * @param {number} betByPlayer The bet of each player.
	 * @param {boolean} isPublic Whether the game is public.
	 * @param {boolean} wasInitiated Whether the game has already started.
	 * @param {string} [matchId] The id of the game's `matches` aggregate.
	 * @param {string} [ruleId] The id of the game's rule plug-in.
	 */
	constructor(
		gameId: GameId,
		creatorId: UserId,
		hostId: UserId,
		status: GameStatus,
		name: string,
		requiredPlayers: number,
		currentPlayers: number,
		betByPlayer: number,
		isPublic: boolean,
		wasInitiated: boolean,
		matchId: string | undefined,
		ruleId?: string,
	) {
		super();
		this.gameId = gameId;
		this.creatorId = creatorId;
		this._hostId = hostId;
		this.status = status;
		this.name = name;
		this.requiredPlayers = requiredPlayers;
		this._currentPlayers = currentPlayers;
		this.betByPlayer = betByPlayer;
		this.isPublic = isPublic;
		this._wasInitiated = wasInitiated;
		this._matchId = matchId;
		this.ruleId = ruleId;
	}

	private _matchId?: string;

	set matchId(value: string) {
		this._matchId = value;
	}

	get matchId(): string {
		return this._matchId;
	}

	get hostId(): UserId {
		return this._hostId;
	}

	private _wasInitiated: boolean;

	get wasInitiated(): boolean {
		return this._wasInitiated;
	}

	private _currentPlayers: number;

	get currentPlayers(): number {
		return this._currentPlayers;
	}

	/**
	 * Converts the transfer object of a game into the domain model.
	 * @param {GameDTO} dto The transfer object.
	 * @returns {Game} The domain model.
	 * @static
	 */
	static fromDTO(dto: GameDTO): Game {
		return new Game(
			new GameId(dto.gameId),
			new UserId(dto.creatorId),
			new UserId(dto.hostId),
			new GameStatus(dto.status),
			dto.name,
			dto.requiredPlayers,
			dto.currentPlayers,
			dto.betByPlayer,
			dto.isPublic,
			dto.wasInitiated,
			dto.matchId,
			dto.ruleId,
		);
	}

	/**
	 * Converts the game into its transfer object.
	 * @returns {GameDTO} The transfer object of the game.
	 */
	toDTO(): GameDTO {
		return {
			gameId: this.gameId.toString(),
			status: this.status.toString(),
			betByPlayer: this.betByPlayer,
			creatorId: this.creatorId.toString(),
			name: this.name,
			isPublic: this.isPublic,
			currentPlayers: this._currentPlayers,
			requiredPlayers: this.requiredPlayers,
			wasInitiated: this._wasInitiated,
			hostId: this._hostId.toString(),
			matchId: this._matchId,
			ruleId: this.ruleId,
		};
	}

	/**
	 * Adds a player to the game.
	 */
	addPlayer(): void {
		this._currentPlayers++;
		if (this._currentPlayers === this.requiredPlayers) this.changeStatus(GameStatusConstants.WAITING_TO_START);
	}

	/**
	 * Removes a player from the game while in the waiting room.
	 */
	removePlayer(): void {
		if (this._currentPlayers > 0) this._currentPlayers--;
		if (this.status.is(GameStatusConstants.WAITING_TO_START)) {
			this.changeStatus(GameStatusConstants.WAITING_PLAYERS);
		}
	}

	/**
	 * Changes the status of a game, running the
	 * corresponding validations.
	 * @param {GameStatusConstants} status The new status of the game.
	 * @throws {GameIsAlreadyStartedException} When the game has already started and someone tries to join it.
	 * @throws {GameCannotBeStartedException} When the game is not waiting to start yet.
	 */
	changeStatus(
		status: GameStatusConstants,
	): void {
		switch (status) {
		case GameStatusConstants.WAITING_TO_START: {
			if (!this.status.is(GameStatusConstants.WAITING_PLAYERS)) throw new GameIsAlreadyStartedException();
			break;
		}
		case GameStatusConstants.ACTIVE: {
			if (!this.status.is(GameStatusConstants.WAITING_TO_START)) throw new GameCannotBeStartedException();
			this._wasInitiated = true;
			break;
		}
		}
		this.status.change(status);
	}
}