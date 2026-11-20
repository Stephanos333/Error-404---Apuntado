import { ApiProperty } from '@nestjs/swagger';
import { CardDTO } from '../../card/card';
import { CardWithDesignDTO } from '../../card/card-with-design';

/**
 * Documentación OpenAPI de una carta.
 *
 * `card/` es código TypeScript puro y no puede usar decoradores de `@nestjs/swagger`
 * (FF-05); esta clase describe la misma forma para Swagger.
 * @class
 * @implements {CardDTO}
 */
export class CardApiDTO implements CardDTO {
	@ApiProperty() type: string;
	@ApiProperty() suit: string;
}

/**
 * Documentación OpenAPI de una carta con diseño.
 * @class
 * @implements {CardWithDesignDTO}
 */
export class CardWithDesignApiDTO extends CardApiDTO implements CardWithDesignDTO {
	@ApiProperty() cardDesignId: string;
	@ApiProperty() cardDesignName: string;
}
