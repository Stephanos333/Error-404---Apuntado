import { Connection, HydratedDocument, Model, Schema, SchemaDefinition } from 'mongoose';
import { GameRecord } from './database.records';
import { FactoryProvider } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { DatabaseConstants } from './database.constants';

/**
 * Model to interact with the games in mongodb.
 */
export type GameDocument = HydratedDocument<GameRecord>;

/**
 * Full definition of a game in mongodb.
 */
const definition: Required<SchemaDefinition<GameRecord>> = {
	name: {
		type: String,
		required: true,
	},
	isPublic: {
		type: Boolean,
		required: true,
		index: 'hashed',
	},
	status: {
		type: String,
		required: true,
		index: 'hashed',
	},
	betByPlayer: {
		type: Number,
		required: true,
	},
	currentPlayers: {
		type: Number,
		required: true,
	},
	requiredPlayers: {
		type: Number,
		required: true,
	},
	gameId: {
		type: String,
		required: true,
		index: 'hashed',
		unique: true,
	},
	creatorId: {
		type: String,
		required: true,
	},
	matchId: {
		type: String,
		required: false,
	},
	wasInitiated: {
		type: Boolean,
		required: true,
	},
	hostId: {
		type: String,
		required: true,
	},
	ruleId: {
		type: String,
		required: false,
	},
};

/**
 * Schema of the games.
 * @const {Schema<GameRecord>}
 */
export const GameSchema: Schema<GameRecord> = new Schema<GameRecord>(definition, { timestamps: true });

/**
 * Connection of the games schema
 * in the database.
 * @type {FactoryProvider}
 */
export const GameSchemaProvider: FactoryProvider = {
	inject: [getConnectionToken(DatabaseConstants.DATABASE_CONNECTION_NAME)],
	provide: DatabaseConstants.GAME_PROVIDER,
	useFactory(connection: Connection): Model<GameRecord> {
		return connection.model<GameRecord>(
			DatabaseConstants.GAME_COLLECTION_NAME, GameSchema,
		);
	},
};