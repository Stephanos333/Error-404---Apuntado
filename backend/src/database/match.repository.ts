import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Collection, Connection, Types, mongo } from 'mongoose';
import { DatabaseConstants } from './database.constants';
import { MatchRecord } from './database.records';

/** Number of recent `commandId`s that are kept (schema: `maxItems: 20`). */
export const MAX_RECENT_COMMANDS = 20;

/** Optimistic concurrency and idempotency condition of a turn command (R03). */
export interface CommandCondition {
	/** Version of the match the client sent the command with. */
	version: number;
	/** Acting player: must hold the turn in the current round. */
	playerId: string;
	/** Unique identifier of the command. */
	commandId: string;
}

/**
 * Access to the `matches` collection (Match aggregate, ADR-04) with the native MongoDB
 * driver, to control exactly the document shape required by the `$jsonSchema`
 * validator (no `__v` and no `_id` in the subdocuments).
 * @class
 */
@Injectable()
export class MatchRepository implements OnModuleInit {
	/**
	 * @param {Connection} connection Mongoose connection to the database.
	 */
	constructor(@InjectConnection(DatabaseConstants.DATABASE_CONNECTION_NAME) private readonly connection: Connection) {}

	private get collection(): Collection<MatchRecord> {
		return this.connection.collection<MatchRecord>(DatabaseConstants.MATCHES_COLLECTION_NAME);
	}

	/** Creates the indexes of the aggregate (idempotent). */
	async onModuleInit(): Promise<void> {
		await this.collection.createIndex({ invitationCode: 1 }, { unique: true });
		await this.collection.createIndex({ 'players.userId': 1, status: 1 });
	}

	/**
	 * Finds a match by its `_id`.
	 * @param {Types.ObjectId} id The identifier.
	 * @param {ClientSession} [session] The session of the ongoing transaction.
	 * @returns {Promise<MatchRecord | null>} The document or `null`.
	 */
	async findById(id: Types.ObjectId, session?: ClientSession): Promise<MatchRecord | null> {
		return this.collection.findOne({ _id: id }, { session });
	}

	/**
	 * Inserts the newly created match.
	 * @param {MatchRecord} match The document.
	 * @param {ClientSession} [session] The session of the ongoing transaction.
	 */
	async insert(match: MatchRecord, session?: ClientSession): Promise<void> {
		await this.collection.insertOne(match, { session });
	}

	/**
	 * Conditional atomic write of a turn command (optimistic concurrency and idempotency).
	 *
	 * Filter: `{ _id, version: n, "currentRound.turn.playerId": actingPlayer, recentCommands: { $ne: commandId } }`.
	 * Update: the full new state, `$inc: { version: 1 }` and
	 * `$push: { recentCommands: { $each: [commandId], $slice: -20 } }`.
	 *
	 * If another command won the race the filter does not match and nothing is written.
	 * @param {MatchRecord} match The new state of the match (its `version` and `recentCommands` are ignored).
	 * @param {CommandCondition} condition The concurrency condition.
	 * @param {ClientSession} [session] The session of the ongoing transaction.
	 * @returns {Promise<boolean>} `true` if the write was applied.
	 */
	async updateIfMatches(match: MatchRecord, condition: CommandCondition, session?: ClientSession): Promise<boolean> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { _id, version, recentCommands: recentCommands, ...status } = match;
		const filter: mongo.Filter<MatchRecord> = {
			_id,
			version: condition.version,
			'currentRound.turn.playerId': condition.playerId,
			recentCommands: { $ne: condition.commandId },
		};
		const update = {
			$set: status,
			$inc: { version: 1 },
			$push: { recentCommands: { $each: [condition.commandId], $slice: -MAX_RECENT_COMMANDS } },
		} as unknown as mongo.UpdateFilter<MatchRecord>;
		const result = await this.collection.updateOne(filter, update, { session });
		return result.matchedCount === 1;
	}
}
