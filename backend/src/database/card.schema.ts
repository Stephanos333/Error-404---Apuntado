import { Schema, SchemaDefinition } from 'mongoose';
import { CardRecord } from './database.records';

/**
 * Full definition of a card in mongodb.
 */
const definition: Required<SchemaDefinition<CardRecord>> = {
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
 * Schema of the cards.
 */
export const CardSchema: Schema<CardRecord> = new Schema<CardRecord>(definition, { timestamps: false, _id: false });