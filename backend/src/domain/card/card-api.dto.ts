import { ApiProperty } from '@nestjs/swagger';
import { CardDTO } from '../../card/card';

/**
 * OpenAPI documentation of a card.
 *
 * `card/` is plain TypeScript code and cannot use `@nestjs/swagger` decorators
 * (FF-05); this class describes the same shape for Swagger.
 * @class
 * @implements {CardDTO}
 */
export class CardApiDTO implements CardDTO {
	@ApiProperty() type: string;
	@ApiProperty() suit: string;
}
