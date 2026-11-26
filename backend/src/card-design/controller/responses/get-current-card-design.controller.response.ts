import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';
import { CardDesignDTO } from '../../../domain/card-design/card-design';

/**
 * Response that returns the current card design.
 * @class
 * @extends DefaultResponse
 */
export class GetCurrentCardDesignControllerResponse extends DefaultResponse {
	@ApiProperty({ type: CardDesignDTO }) design: CardDesignDTO;
}