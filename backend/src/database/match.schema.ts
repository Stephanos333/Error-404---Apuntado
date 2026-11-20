import { Connection, HydratedDocument, Model, Schema, SchemaDefinition } from 'mongoose';
import { MatchRecord } from './database.records';
import { CardDeckSchema } from './card-deck.schema';
import { DiscardedCardsSchema } from './discarded-cards.schema';
import { FactoryProvider } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { DatabaseConstants } from './database.constants';

/**
 * Representa el tipo del modelo para interactuar con las partidas en mongodb.
 */
export type MatchDocument = HydratedDocument<MatchRecord>;

/**
 * Representa la definición completa de una partida en mongodb.
 */
const definition: Required<SchemaDefinition<MatchRecord>> = {
	cardDeck: {
		type: CardDeckSchema,
		required: true,
	},
	currentPlayers: {
		type: Number,
		required: true,
	},
	currentShift: {
		type: Number,
		required: true,
	},
	discardedCards: {
		type: DiscardedCardsSchema,
		required: true,
	},
	gameId: {
		type: String,
		required: true,
	},
	initialPlayers: {
		type: Number,
		required: true,
	},
	matchId: {
		type: String,
		required: true,
		unique: true,
	},
	status: {
		type: String,
		required: true,
	},
	totalShifts: {
		type: Number,
		required: true,
	},
	winner: {
		type: String,
		required: false,
	}
};

/**
 * Constante que representa el esquema de las partidas.
 * @const {Schema<MatchRecord>}
 */
export const MatchSchema: Schema<MatchRecord> = new Schema<MatchRecord>(definition, { timestamps: true });

/**
 * Constante que representa la conexión del esquema de partidas a la base de datos.
 * @type {FactoryProvider<Model<MatchRecord>>}
 */
export const MatchSchemaProvider: FactoryProvider<Model<MatchRecord>> = {
	inject: [getConnectionToken(DatabaseConstants.DATABASE_CONNECTION_NAME)],
	provide: DatabaseConstants.MATCH_PROVIDER,
	useFactory: (connection: Connection): Model<MatchRecord> => {
		return connection.model<MatchRecord>(
			DatabaseConstants.MATCH_COLLECTION_NAME, MatchSchema,
		);
	},
};