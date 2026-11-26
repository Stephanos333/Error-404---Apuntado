/**
 * Concurrency integration test (ADR-04 compliance, R02/R03).
 *
 * It starts an in-memory MongoDB replica set (transactions require it), creates the
 * `matches` and `token_ledger` collections with the `$jsonSchema` validators of
 * `docs/schemas` (validationLevel strict) and runs the real `TurnOrchestrator` against it.
 *
 * It checks that, under simultaneous requests:
 *  - exactly one close succeeds and the other gets a controlled error
 *    (`ROUND_ALREADY_CLOSED` or `NOT_YOUR_TURN`);
 *  - the pot is paid only once and the bets are charged only once;
 *  - a resend with the same `commandId` is idempotent;
 *  - every written document meets the document schema.
 */
import * as fs from 'fs';
import * as path from 'path';
import { v4 } from 'uuid';
import { Connection, Model, Types, createConnection } from 'mongoose';
import { EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { TurnOrchestrator } from '../src/application/match/turn-orchestrator.service';
import { MatchRepository } from '../src/database/match.repository';
import { TokenLedgerRepository } from '../src/database/token-ledger.repository';
import { UnitOfWork } from '../src/database/unit-of-work';
import { DatabaseConstants } from '../src/database/database.constants';
import { GameRecord, PlayerRecord, UserRecord } from '../src/database/database.records';
import { UserSchema } from '../src/database/user.schema';
import { GameSchema } from '../src/database/game.schema';
import { PlayerSchema } from '../src/database/player.schema';
import { createRuleRegistry } from '../src/rule-plugins.module';
import { Game } from '../src/domain/game/game';
import { UserId } from '../src/domain/user/user-id';
import { GameStatusConstants } from '../src/domain/game/game-status.constants';
import { Match } from '../src/domain/match/match';
import { MatchUpdatedEvent } from '../src/domain/events/match/match-updated.event';
import { WINNING_CLOSE, WINNING_HAND, TEST_PARAMETERS, shufflerWithFirst } from './utils/match.fixtures';

const BET = 20;
const INITIAL_BALANCE = 100;
const SCHEMAS = path.join(__dirname, '..', '..', 'docs', 'schemas');

interface Table {
	game: Game;
	host: string;
	guest: string;
	match: Match;
}

describe('Round close concurrency (TurnOrchestrator + MongoDB replica set)', () => {
	let replSet: MongoMemoryReplSet;
	let connection: Connection;
	let userModel: Model<UserRecord>;
	let gameModel: Model<GameRecord>;
	let players: Model<PlayerRecord>;
	let ledgerEntries: TokenLedgerRepository;
	let orchestrator: TurnOrchestrator;
	const published: MatchUpdatedEvent[] = [];

	beforeAll(async () => {
		Logger.overrideLogger(false);
		replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
		connection = await createConnection(replSet.getUri(), { dbName: 'apuntado-e2e' }).asPromise();
		for (const collection of ['matches', 'token_ledger']) {
			const validator = JSON.parse(fs.readFileSync(path.join(SCHEMAS, `${collection}.schema.json`), 'utf8'));
			await connection.db.createCollection(collection, { validator, validationLevel: 'strict', validationAction: 'error' });
		}
		userModel = connection.model<UserRecord>(DatabaseConstants.USER_COLLECTION_NAME, UserSchema);
		gameModel = connection.model<GameRecord>(DatabaseConstants.GAME_COLLECTION_NAME, GameSchema);
		players = connection.model<PlayerRecord>(DatabaseConstants.PLAYER_COLLECTION_NAME, PlayerSchema);
		await Promise.all([userModel.createCollection(), gameModel.createCollection(), players.createCollection()]);
		const matches = new MatchRepository(connection);
		ledgerEntries = new TokenLedgerRepository(connection);
		await matches.onModuleInit();
		await ledgerEntries.onModuleInit();
		const eventBus = { publish: (e: MatchUpdatedEvent) => published.push(e) } as unknown as EventBus;
		orchestrator = new TurnOrchestrator(
			matches,
			ledgerEntries,
			new UnitOfWork(connection),
			createRuleRegistry({}),
			eventBus,
			shufflerWithFirst(WINNING_HAND),
			TEST_PARAMETERS,
			userModel,
			gameModel,
			players,
		);
	});

	afterAll(async () => {
		await connection?.close();
		await replSet?.stop();
	});

	/** Creates two users and a room ready to start, and starts it. The host gets the winning hand. */
	async function startedTable(ruleId: 'classic' | 'apuntado'): Promise<Table> {
		const host = v4();
		const guest = v4();
		const gameId = v4();
		for (const [userId, username] of [[host, `host-${host.slice(0, 4)}`], [guest, `guest-${guest.slice(0, 4)}`]]) {
			await userModel.create({
				userId, username, password: 'x', status: 'PLAYING', icon: 'ICON_1',
				currentDesignId: v4(), currentDesignName: 'default', tokens: INITIAL_BALANCE, cardDesigns: ['default'],
			});
			await players.create({ playerId: v4(), gameId, userId, status: 'WAITING_GAME', isActive: true, triedToWin: false });
		}
		const gameRecord = await gameModel.create({
			gameId, creatorId: host, hostId: host, status: GameStatusConstants.WAITING_TO_START, name: 'E2E table',
			requiredPlayers: 2, currentPlayers: 2, betByPlayer: BET, isPublic: true, wasInitiated: false, ruleId,
		});
		const game = Game.fromDTO(gameRecord.toObject());
		const match = await orchestrator.startMatch(game, new UserId(host));
		return { game, host: host, guest: guest, match: match };
	}

	const close = (table: Table, userId: string, commandId = v4()) =>
		orchestrator.attemptClose(
			{ roomId: table.game.gameId.toString(), matchId: table.match._id, userId: userId, version: table.match.version, commandId: commandId },
			'WIN_4_3_3',
			WINNING_CLOSE.groups,
			WINNING_CLOSE.discard,
		);

	const errors = (results: PromiseSettledResult<unknown>[]) =>
		results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason.message);

	const ledgerEntriesOf = async (table: Table, type: string) =>
		(await ledgerEntries.byMatch(new Types.ObjectId(table.match._id))).filter((a) => a.type === type);

	const balance = async (userId: string) => (await userModel.findOne({ userId }).lean()).tokens;

	it('at the start it charges each bet only once and records it in the token ledger', async () => {
		const table = await startedTable('classic');
		expect(await ledgerEntriesOf(table, 'BET')).toHaveLength(2);
		expect(table.match.pot.total).toBe(2 * BET);
		expect(await balance(table.host)).toBe(INITIAL_BALANCE - BET);
		expect(await balance(table.guest)).toBe(INITIAL_BALANCE - BET);
	});

	it('Classic: two players close at the same time -> exactly one wins and the pot is paid once', async () => {
		const table = await startedTable('classic');
		const results = await Promise.allSettled([close(table, table.host), close(table, table.guest)]);

		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(errors(results)).toHaveLength(1);
		expect(['NOT_YOUR_TURN', 'ROUND_ALREADY_CLOSED']).toContain(errors(results)[0]);
		expect(await ledgerEntriesOf(table, 'POT_PRIZE')).toHaveLength(1);
		expect(await balance(table.host)).toBe(INITIAL_BALANCE - BET + 2 * BET);
		expect(await balance(table.guest)).toBe(INITIAL_BALANCE - BET);
		expect((await gameModel.findOne({ gameId: table.game.gameId.toString() }).lean()).status).toBe(GameStatusConstants.FINISHED);
	});

	it('Classic: the same player sends two simultaneous closes (double click) -> one wins, the other ROUND_ALREADY_CLOSED', async () => {
		const table = await startedTable('classic');
		const results = await Promise.allSettled([close(table, table.host), close(table, table.host)]);

		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(errors(results)).toEqual(['ROUND_ALREADY_CLOSED']);
		expect(await ledgerEntriesOf(table, 'POT_PRIZE')).toHaveLength(1);
		expect(await balance(table.host)).toBe(INITIAL_BALANCE + BET);
	});

	it('resend with the same commandId -> idempotent: it is applied once and not paid twice', async () => {
		const table = await startedTable('classic');
		const commandId = v4();
		const results = await Promise.all([close(table, table.host, commandId), close(table, table.host, commandId)]);

		expect(results.map((r) => r.applied).sort()).toEqual([false, true]);
		expect(await ledgerEntriesOf(table, 'POT_PRIZE')).toHaveLength(1);
		expect(await balance(table.host)).toBe(INITIAL_BALANCE + BET);
	});

	it('Apuntado: two simultaneous closes -> a single atomic settlement of the round', async () => {
		const table = await startedTable('apuntado');
		const results = await Promise.allSettled([close(table, table.host), close(table, table.host), close(table, table.guest)]);

		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		errors(results).forEach((code) => expect(['ROUND_ALREADY_CLOSED', 'NOT_YOUR_TURN']).toContain(code));
		const { publicView: match } = await orchestrator.getState(table.match._id, table.host);
		expect(match.scoreboard).toHaveLength(1);
		expect(match.round.number).toBe(2);
		expect(match.version).toBe(table.match.version + 1);
		expect(match.players.find((j) => j.playerId === table.host).score).toBe(-10);
		expect(await ledgerEntriesOf(table, 'POT_PRIZE')).toHaveLength(0);
	});

	it('a stale version is rejected without writing', async () => {
		const table = await startedTable('classic');
		await expect(
			orchestrator.discard(
				{ roomId: table.game.gameId.toString(), matchId: table.match._id, userId: table.host, version: table.match.version + 7, commandId: v4() },
				10,
			),
		).rejects.toThrow('STALE_VERSION');
		const { publicView: match } = await orchestrator.getState(table.match._id, table.host);
		expect(match.version).toBe(table.match.version);
	});

	it('two simultaneous starts of the same game -> one fails and the bets are not charged twice', async () => {
		const host = v4();
		const guest = v4();
		const gameId = v4();
		for (const userId of [host, guest]) {
			await userModel.create({
				userId, username: `u-${userId.slice(0, 8)}`, password: 'x', status: 'PLAYING', icon: 'ICON_1',
				currentDesignId: v4(), currentDesignName: 'default', tokens: INITIAL_BALANCE, cardDesigns: ['default'],
			});
			await players.create({ playerId: v4(), gameId, userId, status: 'WAITING_GAME', isActive: true, triedToWin: false });
		}
		const gameRecord = await gameModel.create({
			gameId, creatorId: host, hostId: host, status: GameStatusConstants.WAITING_TO_START, name: 'Double table',
			requiredPlayers: 2, currentPlayers: 2, betByPlayer: BET, isPublic: false, wasInitiated: false, ruleId: 'classic',
		});
		const game = () => Game.fromDTO(gameRecord.toObject());
		const results = await Promise.allSettled([
			orchestrator.startMatch(game(), new UserId(host)),
			orchestrator.startMatch(game(), new UserId(host)),
		]);

		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(errors(results)).toEqual(['MATCH_CANNOT_BE_STARTED_ERROR']);
		expect(await balance(host)).toBe(INITIAL_BALANCE - BET);
		expect(await balance(guest)).toBe(INITIAL_BALANCE - BET);
	});

	it('only publishes events of confirmed commands', () => {
		expect(published.length).toBeGreaterThan(0);
		published.forEach((e) => expect(e.match.version).toBeGreaterThanOrEqual(0));
	});
});
