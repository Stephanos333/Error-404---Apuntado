import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Response of the controller that logs
 * a user in.
 *
 * @class
 * @extends DefaultResponse
 */
export class LoginControllerResponse extends DefaultResponse {
	@ApiProperty() accessToken: string;
	@ApiProperty() refreshToken: string;
	@ApiProperty() userId: string;
}