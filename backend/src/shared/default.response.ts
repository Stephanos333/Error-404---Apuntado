import { ApiProperty } from '@nestjs/swagger';

/**
 * Default response of
 * every controller.
 * @class
 */
export class DefaultResponse {
	@ApiProperty() success: boolean = true;
}