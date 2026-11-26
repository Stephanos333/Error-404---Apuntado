import { ApiProperty } from '@nestjs/swagger';
import { CardDesignDTO } from '../../../domain/card-design/card-design';
import { DefaultResponse } from '../../../shared/default.response';

/**
 * Data of the controller response.
 * @class
 * @extends CardDesignDTO
 */
export class GetActiveCardDesignsResponseData extends CardDesignDTO {
	@ApiProperty() canSelect: boolean;
}

/**
 * Response when the active card designs
 * are requested.
 * @class
 * @extends DefaultResponse
 */
export class GetActiveCardDesignsControllerResponse extends DefaultResponse{
	@ApiProperty({ type: [GetActiveCardDesignsResponseData] })
		data: Array<GetActiveCardDesignsResponseData>;
}