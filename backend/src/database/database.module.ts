import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseConstants } from './database.constants';
import { UserSchemaProvider } from './user.schema';
import { ConfigModule } from '@nestjs/config';
import * as process from 'process';
import { CardDesignSchemaProvider } from './card-design.schema';
import { GameSchemaProvider } from './game.schema';
import { PlayerSchemaProvider } from './player.schema';
import { PartidaRepository } from './partida.repository';
import { AsientosTokensRepository } from './asientos-tokens.repository';
import { UnidadDeTrabajo } from './unidad-de-trabajo';

/**
 * Clase en dónde se deben colocar las configuraciones relacionadas con
 * la base de datos del proyecto y sus respectivos modelos.\
 * Se configura:
 * - La conexión a la base de datos (MongoDB Atlas, replica set: requerido por las transacciones).
 * - El esquema de los usuarios.
 * - El esquema de diseño de cartas.
 * - El esquema de los juegos (sala de espera) y de los jugadores (membresía).
 * - El agregado `partidas`, el libro `asientos_tokens` y la unidad de trabajo transaccional (ADR-04).
 * @class
 */
@Module({
	imports: [
		ConfigModule.forRoot(),
		MongooseModule.forRoot(process.env.MONGODB_URI, {
			connectionName: DatabaseConstants.DATABASE_CONNECTION_NAME,
		}),
	],
	providers: [
		UserSchemaProvider,
		CardDesignSchemaProvider,
		GameSchemaProvider,
		PlayerSchemaProvider,
		PartidaRepository,
		AsientosTokensRepository,
		UnidadDeTrabajo,
	],
	exports: [
		MongooseModule,
		UserSchemaProvider,
		CardDesignSchemaProvider,
		GameSchemaProvider,
		PlayerSchemaProvider,
		PartidaRepository,
		AsientosTokensRepository,
		UnidadDeTrabajo,
	],
})
export class DatabaseModule {
}
