import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';
import { CardDesignDTO } from '../../../dominio/card-design/card-design';

/**
 * Clase que define la respuesta para retornar el diseño de cartas actual.
 * @class
 * @extends DefaultResponse
 */
export class GetCurrentCardDesignControllerResponse extends DefaultResponse {
	@ApiProperty({ type: CardDesignDTO }) design: CardDesignDTO;
}