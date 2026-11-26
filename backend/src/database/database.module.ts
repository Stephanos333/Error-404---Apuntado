import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseConstants } from './database.constants';
import { UserSchemaProvider } from './user.schema';
import { ConfigModule } from '@nestjs/config';
import * as process from 'process';
import { CardDesignSchemaProvider } from './card-design.schema';
import { GameSchemaProvider } from './game.schema';
import { PlayerSchemaProvider } from './player.schema';
import { MatchRepository } from './match.repository';
import { TokenLedgerRepository } from './token-ledger.repository';
import { UnitOfWork } from './unit-of-work';

/**
 * Configuration related to the project database
 * and its models.\
 * It configures:
 * - The database connection (MongoDB Atlas, replica set: required by the transactions).
 * - The users schema.
 * - The card designs schema.
 * - The games (waiting room) and players (membership) schemas.
 * - The `matches` aggregate, the `token_ledger` and the transactional unit of work (ADR-04).
 * @class
 */
@Module({
	imports: [
		ConfigModule.forRoot(),
		MongooseModule.forRoot(process.env.MONGODB_URI, {
			connectionName: DatabaseConstants.DATABASE_CONNECTION_NAME,
		}),
	],
	providers: [
		UserSchemaProvider,
		CardDesignSchemaProvider,
		GameSchemaProvider,
		PlayerSchemaProvider,
		MatchRepository,
		TokenLedgerRepository,
		UnitOfWork,
	],
	exports: [
		MongooseModule,
		UserSchemaProvider,
		CardDesignSchemaProvider,
		GameSchemaProvider,
		PlayerSchemaProvider,
		MatchRepository,
		TokenLedgerRepository,
		UnitOfWork,
	],
})
export class DatabaseModule {
}
