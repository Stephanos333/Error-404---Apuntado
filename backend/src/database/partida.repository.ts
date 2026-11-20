import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Collection, Connection, Types, mongo } from 'mongoose';
import { DatabaseConstants } from './database.constants';
import { PartidaRecord } from './database.records';

/** Cantidad de `idComando` recientes que se conservan (esquema: `maxItems: 20`). */
export const MAXIMO_COMANDOS_RECIENTES = 20;

/** Condición de concurrencia optimista e idempotencia de un comando de turno (R03). */
export interface CondicionComando {
	/** Versión de la partida con la que el cliente envió el comando. */
	version: number;
	/** Jugador que actúa: debe tener el turno en la ronda actual. */
	jugadorId: string;
	/** Identificador único del comando. */
	idComando: string;
}

/**
 * Acceso a la colección `partidas` (agregado Partida, ADR-04) con el driver nativo de
 * MongoDB, para controlar exactamente la forma del documento que exige el validador
 * `$jsonSchema` (sin `__v` ni `_id` en los subdocumentos).
 * @class
 */
@Injectable()
export class PartidaRepository implements OnModuleInit {
	/**
	 * @param {Connection} connection Conexión de Mongoose a la base de datos.
	 */
	constructor(@InjectConnection(DatabaseConstants.DATABASE_CONNECTION_NAME) private readonly connection: Connection) {}

	private get coleccion(): Collection<PartidaRecord> {
		return this.connection.collection<PartidaRecord>(DatabaseConstants.PARTIDAS_COLLECTION_NAME);
	}

	/** Crea los índices del agregado (idempotente). */
	async onModuleInit(): Promise<void> {
		await this.coleccion.createIndex({ codigoInvitacion: 1 }, { unique: true });
		await this.coleccion.createIndex({ 'jugadores.usuarioId': 1, estado: 1 });
	}

	/**
	 * Busca una partida por su `_id`.
	 * @param {Types.ObjectId} id El identificador.
	 * @param {ClientSession} [session] La sesión de la transacción en curso.
	 * @returns {Promise<PartidaRecord | null>} El documento o `null`.
	 */
	async buscarPorId(id: Types.ObjectId, session?: ClientSession): Promise<PartidaRecord | null> {
		return this.coleccion.findOne({ _id: id }, { session });
	}

	/**
	 * Inserta la partida recién creada.
	 * @param {PartidaRecord} partida El documento.
	 * @param {ClientSession} [session] La sesión de la transacción en curso.
	 */
	async insertar(partida: PartidaRecord, session?: ClientSession): Promise<void> {
		await this.coleccion.insertOne(partida, { session });
	}

	/**
	 * Escritura atómica condicional de un comando de turno (concurrencia optimista e idempotencia).
	 *
	 * Filtro: `{ _id, version: n, "rondaActual.turno.jugadorId": quienActua, comandosRecientes: { $ne: idComando } }`.
	 * Actualización: el nuevo estado completo, `$inc: { version: 1 }` y
	 * `$push: { comandosRecientes: { $each: [idComando], $slice: -20 } }`.
	 *
	 * Si otro comando ganó la carrera el filtro no coincide y no se escribe nada.
	 * @param {PartidaRecord} partida El nuevo estado de la partida (su `version` y `comandosRecientes` se ignoran).
	 * @param {CondicionComando} condicion La condición de concurrencia.
	 * @param {ClientSession} [session] La sesión de la transacción en curso.
	 * @returns {Promise<boolean>} `true` si se aplicó la escritura.
	 */
	async actualizarSiCoincide(partida: PartidaRecord, condicion: CondicionComando, session?: ClientSession): Promise<boolean> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { _id, version, comandosRecientes, ...estado } = partida;
		const filtro: mongo.Filter<PartidaRecord> = {
			_id,
			version: condicion.version,
			'rondaActual.turno.jugadorId': condicion.jugadorId,
			comandosRecientes: { $ne: condicion.idComando },
		};
		const actualizacion = {
			$set: estado,
			$inc: { version: 1 },
			$push: { comandosRecientes: { $each: [condicion.idComando], $slice: -MAXIMO_COMANDOS_RECIENTES } },
		} as unknown as mongo.UpdateFilter<PartidaRecord>;
		const resultado = await this.coleccion.updateOne(filtro, actualizacion, { session });
		return resultado.matchedCount === 1;
	}
}
