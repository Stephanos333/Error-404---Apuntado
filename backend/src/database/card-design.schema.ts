import { Connection, HydratedDocument, Model, Schema, SchemaDefinition } from 'mongoose';
import { CardDesignRecord } from './database.records';
import { FactoryProvider } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { DatabaseConstants } from './database.constants';

/**
 * Representa el modelo para interactuar con los diseños de cartas en mongodb.
 */
export type CardDesignDocument = HydratedDocument<CardDesignRecord>;

/**
 * Representa la definición completa de un diseño de carta en mongodb.
 */
const definition: Required<SchemaDefinition<CardDesignRecord>> = {
	cardDesignId: {
		type: String,
		required: true,
		index: 'hashed',
		unique: true,
	},
	isDefault: {
		type: Boolean,
		required: true,
		index: 'hashed',
	},
	isFree: {
		type: Boolean,
		required: true,
		index: 'hashed',
	},
	isActive: {
		type: Boolean,
		required: true,
		index: 'hashed',
	},
	price: {
		type: Number,
		required: false,
	},
	name: {
		type: String,
		required: true,
		unique: true,
	},
};

/**
 * Constante que representa el esquema de los diseños de cartas.
 * @const {Schema<CardDesignRecord>}
 */
export const CardDesignSchema: Schema<CardDesignRecord> = new Schema<CardDesignRecord>(definition, { timestamps: true });

/**
 * Constante que representa la conexión del esquema de
 * diseños de cartas en la base de datos.
 */
export const CardDesignSchemaProvider: FactoryProvider = {
	inject: [getConnectionToken(DatabaseConstants.DATABASE_CONNECTION_NAME)],
	provide: DatabaseConstants.CARD_DESIGN_PROVIDER,
	useFactory(connection: Connection): Model<CardDesignRecord> {
		return connection.model<CardDesignRecord>(
			DatabaseConstants.CARD_DESIGN_COLLECTION_NAME, CardDesignSchema,
		);
	},
};