import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Data required to update the
 * card design of a user.
 * @class
 */
export class UpdateUserCardDesignControllerRequest {

	@ApiProperty({ required: true })
	@IsString({ message: ExceptionMessagesConstants.CARD_DESIGN_ID_MUST_BE_A_STRING_ERROR })
	@IsNotEmpty({ message: ExceptionMessagesConstants.CARD_DESIGN_ID_IS_REQUIRED_ERROR })
		cardDesignId: string;
}