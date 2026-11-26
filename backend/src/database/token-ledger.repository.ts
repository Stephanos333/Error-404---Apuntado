import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Collection, Connection, Types } from 'mongoose';
import { DatabaseConstants } from './database.constants';
import { TokenLedgerEntryRecord } from './database.records';

/**
 * `token_ledger` (append-only, ADR-04). It only inserts: an entry is never modified
 * or deleted. The unique index on `reference` prevents a double debit and a double
 * prize even if a command is retried.
 * @class
 */
@Injectable()
export class TokenLedgerRepository implements OnModuleInit {
	/**
	 * @param {Connection} connection Mongoose connection to the database.
	 */
	constructor(@InjectConnection(DatabaseConstants.DATABASE_CONNECTION_NAME) private readonly connection: Connection) {}

	private get collection(): Collection<TokenLedgerEntryRecord> {
		return this.connection.collection<TokenLedgerEntryRecord>(DatabaseConstants.TOKEN_LEDGER_COLLECTION_NAME);
	}

	/** Creates the indexes of the ledger (idempotent). */
	async onModuleInit(): Promise<void> {
		await this.collection.createIndex({ reference: 1 }, { unique: true });
		await this.collection.createIndex({ userId: 1, createdAt: -1 });
	}

	/**
	 * Records entries inside the ongoing transaction.
	 * @param {TokenLedgerEntryRecord[]} ledgerEntries The entries.
	 * @param {ClientSession} session The session of the transaction.
	 */
	async register(ledgerEntries: TokenLedgerEntryRecord[], session: ClientSession): Promise<void> {
		if (ledgerEntries.length > 0) await this.collection.insertMany(ledgerEntries, { session });
	}

	/**
	 * Entries of a match (queries and reconciliation).
	 * @param {Types.ObjectId} matchId The match.
	 * @returns {Promise<TokenLedgerEntryRecord[]>} The entries.
	 */
	async byMatch(matchId: Types.ObjectId): Promise<TokenLedgerEntryRecord[]> {
		return this.collection.find({ matchId: matchId }).toArray();
	}
}
