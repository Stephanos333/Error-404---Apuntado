import { Connection, HydratedDocument, Model, Schema, SchemaDefinition } from 'mongoose';
import { GameRecord } from './database.records';
import { FactoryProvider } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { DatabaseConstants } from './database.constants';

/**
 * Representa el modelo para interactuar con los juegos de mongodb.
 */
export type GameDocument = HydratedDocument<GameRecord>;

/**
 * Representa la definición completa de un juego en mongodb.
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
	partidaId: {
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
 * Constante que representa el esquema de los juegos.
 * @const {Schema<GameRecord>}
 */
export const GameSchema: Schema<GameRecord> = new Schema<GameRecord>(definition, { timestamps: true });

/**
 * Constante que representa la conexión del esquema de
 * juegos en la base de datos.
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