import { Connection, HydratedDocument, Model, Schema, SchemaDefinition } from 'mongoose';
import { CardDesignRecord } from './database.records';
import { FactoryProvider } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { DatabaseConstants } from './database.constants';

/**
 * Model to interact with the card designs in mongodb.
 */
export type CardDesignDocument = HydratedDocument<CardDesignRecord>;

/**
 * Full definition of a card design in mongodb.
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
 * Schema of the card designs.
 * @const {Schema<CardDesignRecord>}
 */
export const CardDesignSchema: Schema<CardDesignRecord> = new Schema<CardDesignRecord>(definition, { timestamps: true });

/**
 * Connection of the card designs schema
 * in the database.
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