import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Data required for a
 * user to refresh their access token.
 *
 * @class
 */
export class RefreshTokenControllerRequest {
	@ApiProperty()
	@IsString({ message: ExceptionMessagesConstants.REFRESH_TOKEN_MUST_BE_A_STRING_ERROR })
	@IsNotEmpty({ message: ExceptionMessagesConstants.REFRESH_TOKEN_IS_REQUIRED_ERROR})
		refreshToken: string;
}