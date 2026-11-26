import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Response of the controller that creates a user.
 *
 * @class
 * @extends DefaultResponse
 */
export class CreateUserControllerResponse extends DefaultResponse {
	@ApiProperty() accessToken: string;
	@ApiProperty() refreshToken: string;
	@ApiProperty() userId: string;
}