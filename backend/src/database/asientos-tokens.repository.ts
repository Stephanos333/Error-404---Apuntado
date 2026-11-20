import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Collection, Connection, Types } from 'mongoose';
import { DatabaseConstants } from './database.constants';
import { AsientoTokensRecord } from './database.records';

/**
 * Libro de tokens `asientos_tokens` (append-only, ADR-04). Solo inserta: un asiento
 * nunca se modifica ni se borra. El índice único sobre `referencia` impide el doble
 * débito y el doble premio aunque un comando se reintente.
 * @class
 */
@Injectable()
export class AsientosTokensRepository implements OnModuleInit {
	/**
	 * @param {Connection} connection Conexión de Mongoose a la base de datos.
	 */
	constructor(@InjectConnection(DatabaseConstants.DATABASE_CONNECTION_NAME) private readonly connection: Connection) {}

	private get coleccion(): Collection<AsientoTokensRecord> {
		return this.connection.collection<AsientoTokensRecord>(DatabaseConstants.ASIENTOS_TOKENS_COLLECTION_NAME);
	}

	/** Crea los índices del libro (idempotente). */
	async onModuleInit(): Promise<void> {
		await this.coleccion.createIndex({ referencia: 1 }, { unique: true });
		await this.coleccion.createIndex({ usuarioId: 1, en: -1 });
	}

	/**
	 * Registra asientos dentro de la transacción en curso.
	 * @param {AsientoTokensRecord[]} asientos Los asientos.
	 * @param {ClientSession} session La sesión de la transacción.
	 */
	async registrar(asientos: AsientoTokensRecord[], session: ClientSession): Promise<void> {
		if (asientos.length > 0) await this.coleccion.insertMany(asientos, { session });
	}

	/**
	 * Asientos de una partida (consultas y conciliación).
	 * @param {Types.ObjectId} partidaId La partida.
	 * @returns {Promise<AsientoTokensRecord[]>} Los asientos.
	 */
	async porPartida(partidaId: Types.ObjectId): Promise<AsientoTokensRecord[]> {
		return this.coleccion.find({ partidaId }).toArray();
	}
}
