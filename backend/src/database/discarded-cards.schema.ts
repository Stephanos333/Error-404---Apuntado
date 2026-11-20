import { Schema, SchemaDefinition } from 'mongoose';
import { DiscardedCardsRecord } from './database.records';
import { CardWithDesignSchema } from './card-with-design.schema';

/**
 * Representa la definición completa de las cartas desechadas en mongodb.
 */
const definition: Required<SchemaDefinition<DiscardedCardsRecord>> = {
	cards: {
		type: [CardWithDesignSchema],
		required: true,
	},
};

/**
 * Constante que representa el esquema de las cartas desechadas.
 */
export const DiscardedCardsSchema: Schema<DiscardedCardsRecord> = new Schema<DiscardedCardsRecord>(
	definition, { timestamps: false, _id: false },
);