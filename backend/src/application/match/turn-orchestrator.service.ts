import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { ClientSession, Model, Types } from 'mongoose';
import { randomInt } from 'node:crypto';
import { DatabaseConstants } from '../../database/database.constants';
import { TokenLedgerEntryRecord, GameRecord, PlayerRecord, UserRecord } from '../../database/database.records';
import { MatchRepository } from '../../database/match.repository';
import { TokenLedgerRepository } from '../../database/token-ledger.repository';
import { UnitOfWork } from '../../database/unit-of-work';
import { RuleRegistry } from '../../rules/registry/rule-registry';
import { GameRulePlugin, CloseType } from '../../rules/contract/game-rule.plugin';
import { Game } from '../../domain/game/game';
import { GameStatusConstants } from '../../domain/game/game-status.constants';
import { UserId } from '../../domain/user/user-id';
import { UserStatusConstants } from '../../domain/user/user-status.constants';
import { NotEnoughTokensException } from '../../domain/user/exceptions/not-enough-tokens.exception';
import { MatchCannotBeStartedException } from '../../domain/match/match-cannot-be-started.exception';
import { OnlyGameHostCanStartTheMatchException } from '../../domain/match/only-game-host-can-start-the-match.exception';
import { PotContribution, MatchSettings, DrawSource, MatchParameters, Match } from '../../domain/match/match';
import { SHUFFLER, Shuffler } from '../../domain/match/match-cards';
import {
	NewMatchData,
	TransitionResult,
	createMatch,
	discard,
	attemptClose,
	draw,
} from '../../domain/match/match-commands';
import { PrivateMatchView, PublicMatchView, privateView, publicView } from '../../domain/match/match-views';
import {
	MatchConflictException,
	InvalidMatchException,
	MatchNotFoundException,
} from '../../domain/match/match.exceptions';
import { MatchUpdatedEvent } from '../../domain/events/match/match-updated.event';
import { ExceptionMessagesConstants as M } from '../../shared/exceptions/exception-messages.constants';
import { SYSTEM_PARAMETERS } from './system-parameters';
import { toDomain, toRecord } from './match.mapper';

/** Data shared by every turn command (R03). */
export interface TurnCommand {
	/** Game (room) the command is sent from; it identifies the `match:{roomId}` room. */
	roomId: string;
	/** `_id` of the `matches` aggregate. */
	matchId: string;
	/** Authenticated user (JWT); it is the `playerId` inside the match. */
	userId: string;
	/** Version of the match the client sends the command with. */
	version: number;
	/** Unique identifier of the command (idempotency). */
	commandId: string;
}

/** Result of a turn command. */
export interface CommandResult {
	/** `false` if the command had already been applied (idempotent resend): the effect is not repeated. */
	applied: boolean;
	match: Match;
}

/** Match state a user can see (RF-14, reconnection). */
export interface StateForUser {
	publicView: PublicMatchView;
	privateView: PrivateMatchView | null;
}

/** Internal signal: the conditional write did not match (another command won the race). */
class UnmatchedWriteError extends Error {}

const CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MIN_NAME = 3;
const MAX_NAME = 30;

/**
 * Turn orchestrator (`TurnOrchestrator`, ADR-05): synchronous path of the command.
 *
 * 1. Reads the `matches` aggregate once.
 * 2. Computes the new state in memory with the match plug-in: close validation,
 *    settlement and outcome included (§2.4).
 * 3. Persists it in ONE conditional atomic write (`version`, turn and `commandId`).
 *    If the command spans aggregates (charging bets, paying the pot) it uses a
 *    `snapshot`/`majority` transaction.
 * 4. Only after the commit it publishes the domain events (persist before notifying).
 *
 * It knows neither Socket.IO nor any concrete plug-in.
 * @class
 */
@Injectable()
export class TurnOrchestrator {
	private readonly logger: Logger = new Logger(TurnOrchestrator.name);

	constructor(
		private readonly matches: MatchRepository,
		private readonly ledger: TokenLedgerRepository,
		private readonly unitOfWork: UnitOfWork,
		private readonly ruleRegistry: RuleRegistry,
		private readonly eventBus: EventBus,
		@Inject(SHUFFLER) private readonly shuffler: Shuffler,
		@Inject(SYSTEM_PARAMETERS) private readonly parameters: MatchParameters,
		@Inject(DatabaseConstants.USER_PROVIDER) private readonly userModel: Model<UserRecord>,
		@Inject(DatabaseConstants.GAME_PROVIDER) private readonly gameModel: Model<GameRecord>,
		@Inject(DatabaseConstants.PLAYER_PROVIDER) private readonly playerModel: Model<PlayerRecord>,
	) {}

	/**
	 * Starts the match of a game: charges the bets, records them in the token ledger,
	 * creates the aggregate with the first round dealt and marks the game as active, all in
	 * a single transaction. A second concurrent start fails without charging twice.
	 * @param {Game} game The game (room) being started.
	 * @param {UserId} requester The user who starts it; must be the host.
	 * @returns {Promise<Match>} The created match.
	 * @throws {MatchCannotBeStartedException} When the game is not ready or already started.
	 * @throws {OnlyGameHostCanStartTheMatchException} When the requester is not the host.
	 * @throws {NotEnoughTokensException} When a player does not have enough tokens for the bet.
	 */
	async startMatch(game: Game, requester: UserId): Promise<Match> {
		this.logger.log(`[${this.startMatch.name}] INIT :: game: ${game.gameId.toString()}`);
		if (!game.status.is(GameStatusConstants.WAITING_TO_START)) throw new MatchCannotBeStartedException();
		if (game.hostId.toString() !== requester.toString()) throw new OnlyGameHostCanStartTheMatchException();
		const rule: GameRulePlugin = this.ruleRegistry.get(game.ruleId);
		const gameRecord: GameRecord = game.toDTO();
		const lobby = await this.playerModel.find({ gameId: gameRecord.gameId, isActive: true }, { userId: 1 }).lean<Array<Pick<PlayerRecord, 'userId'>>>();
		const order = this.shuffler.shuffle(lobby);
		const matchId = new Types.ObjectId();
		const result = await this.unitOfWork.execute(async (session) => {
			const { ledgerEntries: ledgerEntries, contributions, participants } = await this.chargeBets(order, gameRecord, matchId, session);
			const host = participants.find((p) => p.playerId === gameRecord.hostId) ?? participants[0];
			const transition = createMatch(
				this.newMatchData(matchId, gameRecord, rule, host.userId, participants, contributions),
				rule.dealSettings(),
				this.shuffler,
			);
			await this.ledger.register(ledgerEntries, session);
			await this.matches.insert(toRecord(transition.match), session);
			const updated = await this.gameModel.updateOne(
				{ gameId: gameRecord.gameId, status: GameStatusConstants.WAITING_TO_START },
				{ $set: { status: GameStatusConstants.ACTIVE, wasInitiated: true, matchId: matchId.toHexString() } },
				{ session },
			);
			if (updated.matchedCount !== 1) throw new MatchCannotBeStartedException();
			return transition;
		});
		this.publish(gameRecord.gameId, result);
		this.logger.log(`[${this.startMatch.name}] FINISH :: match: ${matchId.toHexString()}`);
		return result.match;
	}

	/** Draw command (from the deck or the discard pile). */
	async draw(command: TurnCommand, source: DrawSource): Promise<CommandResult> {
		return this.execute(command, (match) => draw(match, command.userId, source, this.shuffler));
	}

	/** Discard command (passes the turn; in the extra round, the last discard settles the round). */
	async discard(command: TurnCommand, card: number, groups?: number[][]): Promise<CommandResult> {
		return this.execute(command, (match, rule) =>
			discard(match, command.userId, card, groups, { rule: rule, shuffler: this.shuffler, now: new Date() }),
		);
	}

	/** Attempt-to-close-the-round command (4-3-3 or knock). */
	async attemptClose(command: TurnCommand, type: CloseType, groups: number[][], discard: number): Promise<CommandResult> {
		return this.execute(command, (match, rule) =>
			attemptClose(match, command.userId, { type: type, groups: groups, discard: discard }, { rule: rule, shuffler: this.shuffler, now: new Date() }),
		);
	}

	/**
	 * Current state of the match for a user: public view + their hand (RF-14).
	 * @throws {InvalidMatchException} When the user is not a player of the match.
	 */
	async getState(matchId: string, userId: string): Promise<StateForUser> {
		const match = await this.load(matchId);
		if (!match.players.some((j) => j.playerId === userId)) {
			throw new InvalidMatchException(M.PLAYER_NOT_IN_MATCH);
		}
		return { publicView: publicView(match), privateView: privateView(match, userId) };
	}

	/**
	 * Common path of the turn commands: idempotency, in-memory computation, conditional
	 * write and publication after the commit.
	 */
	private async execute(
		command: TurnCommand,
		apply: (match: Match, rule: GameRulePlugin) => TransitionResult,
	): Promise<CommandResult> {
		const base = await this.load(command.matchId);
		if (base.recentCommands.includes(command.commandId)) return { applied: false, match: base };
		// The domain status and turn guards answer ROUND_ALREADY_CLOSED / NOT_YOUR_TURN right away.
		const result = apply(base, this.ruleRegistry.get(base.settings.plugin.id));
		if (base.version !== command.version) throw new MatchConflictException(M.STALE_VERSION);
		const next: Match = {
			...result.match,
			version: base.version + 1,
			recentCommands: [...base.recentCommands, command.commandId].slice(-20),
			updatedAt: new Date(),
		};
		try {
			await this.save(next, command, result.finished);
		} catch (e) {
			if (e instanceof UnmatchedWriteError) return this.resolveConflict(command, base);
			throw e;
		}
		this.publish(command.roomId, { ...result, match: next });
		return { applied: true, match: next };
	}

	/**
	 * Persists the command. If the match finished, the aggregate write and the pot
	 * payment go in the same transaction; otherwise it is a single atomic write.
	 */
	private async save(next: Match, command: TurnCommand, finished: boolean): Promise<void> {
		const condition = { version: command.version, playerId: command.userId, commandId: command.commandId };
		if (!finished) {
			if (!(await this.matches.updateIfMatches(toRecord(next), condition))) throw new UnmatchedWriteError();
			return;
		}
		await this.unitOfWork.execute(async (session) => {
			if (!(await this.matches.updateIfMatches(toRecord(next), condition, session))) throw new UnmatchedWriteError();
			await this.payPot(next, command.roomId, session);
		});
	}

	/**
	 * Another command won the race: the match is read again to answer with a controlled
	 * error, or with idempotent success if the same `commandId` was already applied.
	 */
	private async resolveConflict(command: TurnCommand, base: Match): Promise<CommandResult> {
		const latest = await this.load(command.matchId);
		if (latest.recentCommands.includes(command.commandId)) return { applied: false, match: latest };
		const round = latest.currentRound;
		const roundChanged = !round || round.number !== base.currentRound?.number || !['IN_TURNS', 'EXTRA_ROUND'].includes(round.status);
		if (latest.status !== 'IN_PROGRESS' || roundChanged) throw new MatchConflictException(M.ROUND_ALREADY_CLOSED);
		if (round.turn.playerId !== command.userId) throw new MatchConflictException(M.NOT_YOUR_TURN);
		throw new MatchConflictException(M.STALE_VERSION);
	}

	/**
	 * Charges each player's bet (debit conditioned on having enough balance) and prepares the
	 * `BET` entries of the token ledger. It runs inside the start transaction.
	 */
	private async chargeBets(
		lobby: Array<Pick<PlayerRecord, 'userId'>>,
		game: GameRecord,
		matchId: Types.ObjectId,
		session: ClientSession,
	) {
		const ledgerEntries: TokenLedgerEntryRecord[] = [];
		const contributions: PotContribution[] = [];
		const participants: NewMatchData['players'] = [];
		const now = new Date();
		for (const [index, player] of lobby.entries()) {
			const user = await this.userModel
				.findOneAndUpdate({ userId: player.userId, tokens: { $gte: game.betByPlayer } }, { $inc: { tokens: -game.betByPlayer } }, { session, new: true })
				.lean<UserRecord & { _id: Types.ObjectId }>();
			if (!user) throw new NotEnoughTokensException();
			const ledgerEntryId = new Types.ObjectId();
			ledgerEntries.push({
				_id: ledgerEntryId,
				userId: user._id,
				type: 'BET',
				amount: -game.betByPlayer,
				reference: `BET:${matchId.toHexString()}:${user._id.toHexString()}`,
				matchId,
				createdAt: now,
			});
			contributions.push({ userId: user._id.toHexString(), type: 'BET', amount: game.betByPlayer, ledgerEntryId: ledgerEntryId.toHexString() });
			participants.push({ playerId: player.userId, userId: user._id.toHexString(), username: user.username, position: index + 1 });
		}
		return { ledgerEntries, contributions, participants };
	}

	/**
	 * Pays the pot to the winner (`POT_PRIZE` entry with a unique reference and a credit to the
	 * `tokens` cache), closes the room and releases the players. It goes in the same
	 * transaction as the final write of the aggregate.
	 */
	private async payPot(match: Match, roomId: string, session: ClientSession): Promise<void> {
		const winner = match.players.find((j) => j.playerId === match.winnerId);
		const matchId = new Types.ObjectId(match._id);
		await this.ledger.register(
			[{
				_id: new Types.ObjectId(),
				userId: new Types.ObjectId(winner.userId),
				type: 'POT_PRIZE',
				amount: match.pot.total,
				reference: `POT_PRIZE:${match._id}`,
				matchId,
				createdAt: new Date(),
			}],
			session,
		);
		await this.userModel.updateOne({ userId: winner.playerId }, { $inc: { tokens: match.pot.total } }, { session });
		const ids = match.players.map((j) => j.playerId);
		await this.userModel.updateMany({ userId: { $in: ids } }, { $set: { status: UserStatusConstants.ACTIVE } }, { session });
		await this.gameModel.updateOne({ gameId: roomId }, { $set: { status: GameStatusConstants.FINISHED } }, { session });
		await this.playerModel.updateMany({ gameId: roomId }, { $set: { isActive: false } }, { session });
	}

	private newMatchData(
		matchId: Types.ObjectId,
		game: GameRecord,
		rule: GameRulePlugin,
		hostId: string,
		players: NewMatchData['players'],
		contributions: PotContribution[],
	): NewMatchData {
		const settings: MatchSettings = {
			mode: rule.descriptor.id,
			plugin: { id: rule.descriptor.id, version: rule.descriptor.version },
			capacity: game.requiredPlayers,
			betPerPlayer: game.betByPlayer,
			visibility: game.isPublic ? 'PUBLIC' : 'PRIVATE',
			runType: 'WITH_WRAP',
			jokersEnabled: false,
			rebuyEnabled: false,
			negativeVictoryEnabled: rule.descriptor.multiRound,
			parameters: { ...this.parameters },
		};
		return {
			id: matchId.toHexString(),
			invitationCode: Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(''),
			name: game.name.slice(0, MAX_NAME).padEnd(MIN_NAME, '_'),
			hostId: hostId,
			settings: settings,
			players: players,
			contributions: contributions,
			now: new Date(),
		};
	}

	private async load(matchId: string): Promise<Match> {
		if (!Types.ObjectId.isValid(matchId)) throw new MatchNotFoundException();
		const record = await this.matches.findById(new Types.ObjectId(matchId));
		if (!record) throw new MatchNotFoundException();
		return toDomain(record);
	}

	/** Publishes the domain events (only after the commit). */
	private publish(roomId: string, result: TransitionResult): void {
		this.eventBus.publish(new MatchUpdatedEvent(roomId, result.match, result.events));
	}
}
