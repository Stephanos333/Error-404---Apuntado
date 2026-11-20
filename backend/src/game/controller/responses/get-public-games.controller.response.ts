import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';
import { GameDTO } from '../../../dominio/game/game';

/**
 * Clase que representa la respuesta del controlador para buscar
 * los juegos públicos.
 * @class
 * @extends {DefaultResponse}
 */
export class GetPublicGamesControllerResponse extends DefaultResponse {
	@ApiProperty({ type: [GameDTO] }) data: Array<GameDTO>;
}