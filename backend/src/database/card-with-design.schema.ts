import { Schema, SchemaDefinition } from 'mongoose';
import { CardWithDesignRecord } from './database.records';

/**
 * Representa la definición completa de una carta con diseño en mongodb.
 */
export const definition: Required<SchemaDefinition<CardWithDesignRecord>> = {
	cardDesignId: {
		type: String,
		required: true,
	},
	cardDesignName: {
		type: String,
		required: true,
	},
	type: {
		type: String,
		required: true,
	},
	suit: {
		type: String,
		required: true,
	},
};

/**
 * Constante que representa el esquema de las cartas con diseño.
 */
export const CardWithDesignSchema: Schema<CardWithDesignRecord> = new Schema<CardWithDesignRecord>(definition, {
	timestamps: false,
	_id: false,
});