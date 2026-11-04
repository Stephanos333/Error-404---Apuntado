// VIOLACIÓN intencional: un controlador (presentación) usa directamente la persistencia.
import { PartidaSchema } from '../../database/partida.schema';
import { model } from 'mongoose';

export class SalaController {
	listar(): string {
		return `${PartidaSchema.coleccion}:${typeof model}`;
	}
}
