import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ExceptionMessagesConstants } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Data required to create a game.
 * @class
 */
export class CreateGameControllerRequest {
	@ApiProperty({ required: true })
	@Max(6, { message: ExceptionMessagesConstants.REQUIRED_PLAYERS_MUST_BE_IN_RANGE_ERROR })
	@Min(2, { message: ExceptionMessagesConstants.REQUIRED_PLAYERS_MUST_BE_IN_RANGE_ERROR })
	@IsInt({ message: ExceptionMessagesConstants.REQUIRED_PLAYERS_MUST_BE_A_INTEGER_ERROR })
	@IsNotEmpty({ message: ExceptionMessagesConstants.REQUIRED_PLAYERS_IS_REQUIRED_ERROR })
		requiredPlayers: number;

	@ApiProperty({ required: true })
	@IsBoolean({ message: ExceptionMessagesConstants.IS_PUBLIC_MUST_BE_A_BOOLEAN_ERROR })
	@IsNotEmpty({ message: ExceptionMessagesConstants.IS_PUBLIC_IS_REQUIRED_ERROR })
		isPublic: boolean;

	@ApiProperty({ required: true })
	@Min(1, { message: ExceptionMessagesConstants.BET_BY_PLAYER_MUST_BE_GREATER_THAN_0_ERROR })
	@IsInt({ message: ExceptionMessagesConstants.BET_BY_PLAYER_MUST_BE_A_INTEGER_ERROR })
	@IsNotEmpty({ message: ExceptionMessagesConstants.BET_BY_PLAYER_IS_REQUIRED_ERROR })
		betByPlayer: number;

	@ApiProperty({ required: true })
	@IsString({ message: ExceptionMessagesConstants.GAME_NAME_MUST_BE_A_STRING_ERROR })
	@IsNotEmpty({ message: ExceptionMessagesConstants.GAME_NAME_IS_REQUIRED_ERROR })
		name: string;
	@ApiProperty({
		required: false,
		description: 'Id of the rule plug-in (e.g. "classic" or "apuntado"). The default rule is used when omitted.',
	})
	@IsOptional()
	@IsString({ message: ExceptionMessagesConstants.GAME_RULE_MUST_BE_A_STRING_ERROR })
		ruleId?: string;
}