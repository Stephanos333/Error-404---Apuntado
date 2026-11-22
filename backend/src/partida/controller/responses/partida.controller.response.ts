import { ApiProperty } from '@nestjs/swagger';
import { DefaultResponse } from '../../../shared/default.response';
import { VistaPrivadaPartida, VistaPublicaPartida } from '../../../dominio/partida/vistas-partida';

/**
 * Respuesta de la partida: vista pública y la mano del usuario que consulta.
 * @class
 */
export class PartidaControllerResponse extends DefaultResponse {
	@ApiProperty({ description: '`false` si el comando ya se había aplicado (reenvío idempotente).' }) aplicado: boolean;
	@ApiProperty({ type: Object, description: 'Vista pública: sin cartas de las manos ni contenido del mazo.' }) partida: VistaPublicaPartida;
	@ApiProperty({ type: Object, nullable: true, description: 'La mano del usuario autenticado.' }) mano: VistaPrivadaPartida | null;
}
