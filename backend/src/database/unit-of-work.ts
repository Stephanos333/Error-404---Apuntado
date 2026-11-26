import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, mongo } from 'mongoose';
import { DatabaseConstants } from './database.constants';

/**
 * Options of the multi-aggregate transactions (ADR-04 point 6): `snapshot` read,
 * write acknowledged by the majority of the replica set and read on the primary.
 */
export const TRANSACTION_OPTIONS: mongo.TransactionOptions = {
	readConcern: { level: 'snapshot' },
	writeConcern: { w: 'majority' },
	readPreference: 'primary',
};

/**
 * Transactional unit of work for the commands that span aggregates (match +
 * token ledger + users + room), e.g. charging the bets and paying the pot.
 * It uses `session.withTransaction()`, which retries on transient errors
 * (e.g. `WriteConflict`) and aborts on any other error.
 * @class
 */
@Injectable()
export class UnitOfWork {
	/**
	 * @param {Connection} connection Mongoose connection (requires a replica set).
	 */
	constructor(@InjectConnection(DatabaseConstants.DATABASE_CONNECTION_NAME) private readonly connection: Connection) {}

	/**
	 * Runs the work inside a transaction.
	 * @param {(session: ClientSession) => Promise<T>} work The operations; they must use the received session.
	 * @returns {Promise<T>} The result of the work once the transaction is committed.
	 */
	async execute<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
		const session: ClientSession = await this.connection.startSession();
		try {
			let result: T;
			await session.withTransaction(async () => {
				result = await work(session);
			}, TRANSACTION_OPTIONS);
			return result;
		} finally {
			await session.endSession();
		}
	}
}
