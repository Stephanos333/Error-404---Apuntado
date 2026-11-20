import { UserRecord } from './database.records';
import { Connection, HydratedDocument, Model, Schema, SchemaDefinition } from 'mongoose';
import { FactoryProvider } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { DatabaseConstants } from './database.constants';

/**
 * Representa el modelo para interactuar con los usuarios en mongodb.
 */
export type UserDocument = HydratedDocument<UserRecord>;

/**
 * Representa la definición completa de un usuario en mongodb.
 */
const definition: Required<SchemaDefinition<UserRecord>> = {
	cardDesigns: {
		type: [String],
		required: true,
	},
	currentDesignId: {
		type: String,
		required: true,
	},
	currentDesignName: {
		type: String,
		required: true,
	},
	icon: {
		type: String,
		required: true,
	},
	status: {
		type: String,
		required: true,
	},
	tokens: {
		type: Number,
		required: true,
	},
	userId: {
		type: String,
		required: true,
		index: 'hashed',
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
	username: {
		type: String,
		required: true,
		index: 'hashed',
	},
};

/**
 * Constante que representa el esquema de los usuarios.
 * @const {Schema<UserRecord>}
 */
export const UserSchema: Schema<UserRecord> = new Schema<UserRecord>(definition, { timestamps: true });

/**
 * Constante que representa la conexión del esquema
 * de usuarios en la base de datos.
 * @type {FactoryProvider}
 */
export const UserSchemaProvider: FactoryProvider = {
	inject: [getConnectionToken(DatabaseConstants.DATABASE_CONNECTION_NAME)],
	provide: DatabaseConstants.USER_PROVIDER,
	useFactory(connection: Connection): Model<UserRecord> {
		return connection.model<UserRecord>(
			DatabaseConstants.USER_COLLECTION_NAME, UserSchema,
		);
	},
};