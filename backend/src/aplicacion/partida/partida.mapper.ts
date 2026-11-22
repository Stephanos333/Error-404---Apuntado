import { Types } from 'mongoose';
import { PartidaRecord } from '../../database/database.records';
import { Partida } from '../../dominio/partida/partida';

const aObjectId = (hex: string): Types.ObjectId => new Types.ObjectId(hex);

/**
 * Traduce la partida del dominio al documento persistido: los identificadores
 * hexadecimales pasan a `ObjectId` (`docs/schemas/partidas.schema.json`).
 * @param {Partida} partida La partida del dominio.
 * @returns {PartidaRecord} El documento.
 */
export function aRegistro(partida: Partida): PartidaRecord {
	return {
		...partida,
		_id: aObjectId(partida._id),
		anfitrionId: aObjectId(partida.anfitrionId),
		configuracion: { ...partida.configuracion, parametros: { ...partida.configuracion.parametros } },
		jugadores: partida.jugadores.map((j) => ({ ...j, usuarioId: aObjectId(j.usuarioId) })),
		pozo: {
			total: partida.pozo.total,
			aportes: partida.pozo.aportes.map((a) => ({ ...a, usuarioId: aObjectId(a.usuarioId), asientoId: aObjectId(a.asientoId) })),
		},
	};
}

/**
 * Traduce el documento persistido a la partida del dominio.
 * @param {PartidaRecord} registro El documento.
 * @returns {Partida} La partida del dominio.
 */
export function aDominio(registro: PartidaRecord): Partida {
	const base = registro as unknown as Partida;
	return {
		...base,
		_id: registro._id.toHexString(),
		anfitrionId: registro.anfitrionId.toHexString(),
		jugadores: registro.jugadores.map((j) => ({ ...(j as unknown as Partida['jugadores'][number]), usuarioId: j.usuarioId.toHexString() })),
		pozo: {
			total: registro.pozo.total,
			aportes: registro.pozo.aportes.map((a) => ({
				...(a as unknown as Partida['pozo']['aportes'][number]),
				usuarioId: a.usuarioId.toHexString(),
				asientoId: a.asientoId.toHexString(),
			})),
		},
	};
}
