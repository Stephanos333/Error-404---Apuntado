import { Schema, SchemaDefinition } from 'mongoose';
import { CardDeckRecord } from './database.records';
import { CardSchema } from './card.schema';

/**
 * Representa la definición completa de una mazo de cartas en mongodb.
 */
const definition: Required<SchemaDefinition<CardDeckRecord>> = {
	cards: {
		required: true,
		type: [CardSchema],
	},
};

/**
 * Constante que representa el esquema de los mazos de cartas.
 */
export const CardDeckSchema: Schema<CardDeckRecord> = new Schema<CardDeckRecord>(definition, {
	timestamps: false,
	_id: false,
});