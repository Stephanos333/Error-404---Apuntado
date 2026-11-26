import { ApiProperty } from '@nestjs/swagger';
import { DefaultResponse } from '../../../shared/default.response';

/**
 * Response of the controller that
 * refreshes the access token of a user.
 * @class
 */
export class RefreshTokenControllerResponse extends DefaultResponse {
	@ApiProperty() accessToken: string;
}