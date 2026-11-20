import { Schema, SchemaDefinition } from 'mongoose';
import { CardRecord } from './database.records';

/**
 * Representa la definición completa de una carta en mongodb.
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
 * Constante que representa el esquema de las cartas.
 */
export const CardSchema: Schema<CardRecord> = new Schema<CardRecord>(definition, { timestamps: false, _id: false });