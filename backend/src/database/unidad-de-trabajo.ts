import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, mongo } from 'mongoose';
import { DatabaseConstants } from './database.constants';

/**
 * Opciones de las transacciones multi-agregado (ADR-04 punto 6): lectura `snapshot`,
 * escritura confirmada por la mayoría del replica set y lectura en el primario.
 */
export const OPCIONES_TRANSACCION: mongo.TransactionOptions = {
	readConcern: { level: 'snapshot' },
	writeConcern: { w: 'majority' },
	readPreference: 'primary',
};

/**
 * Unidad de trabajo transaccional para los comandos que cruzan agregados (partida +
 * libro de tokens + usuarios + sala), por ejemplo el cobro de apuestas y el pago del pozo.
 * Usa `session.withTransaction()`, que reintenta ante errores transitorios
 * (p. ej. `WriteConflict`) y aborta ante cualquier otro error.
 * @class
 */
@Injectable()
export class UnidadDeTrabajo {
	/**
	 * @param {Connection} connection Conexión de Mongoose (requiere replica set).
	 */
	constructor(@InjectConnection(DatabaseConstants.DATABASE_CONNECTION_NAME) private readonly connection: Connection) {}

	/**
	 * Ejecuta el trabajo en una transacción.
	 * @param {(session: ClientSession) => Promise<T>} trabajo Las operaciones; deben usar la sesión recibida.
	 * @returns {Promise<T>} El resultado del trabajo una vez confirmada la transacción.
	 */
	async ejecutar<T>(trabajo: (session: ClientSession) => Promise<T>): Promise<T> {
		const session: ClientSession = await this.connection.startSession();
		try {
			let resultado: T;
			await session.withTransaction(async () => {
				resultado = await trabajo(session);
			}, OPCIONES_TRANSACCION);
			return resultado;
		} finally {
			await session.endSession();
		}
	}
}
