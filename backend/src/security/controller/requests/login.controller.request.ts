import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Data required for a
 * user to log in.
 *
 * @class
 */
export class LoginControllerRequest {
	@ApiProperty()
	@IsString({ message: ExceptionMessagesConstants.USERNAME_MUST_BE_A_STRING_ERROR })
	@IsNotEmpty({ message: ExceptionMessagesConstants.USERNAME_IS_REQUIRED_ERROR })
		username: string;

	@ApiProperty()
	@IsString({ message: ExceptionMessagesConstants.PASSWORD_MUST_BE_A_STRING_ERROR })
	@IsNotEmpty({ message: ExceptionMessagesConstants.PASSWORD_IS_REQUIRED_ERROR })
		password: string;
}