import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { ExceptionMessagesConstants as M } from '../../../shared/exceptions/exception-messages.constants';

/**
 * Concurrency data carried by every turn command (R03).
 * The client sends its intent; the server decides the result.
 * @class
 */
export class TurnCommandRequest {
	@ApiProperty({ description: 'Version of the match known by the client (optimistic concurrency).', minimum: 0 })
	@IsInt({ message: M.VERSION_MUST_BE_A_NON_NEGATIVE_INTEGER_ERROR })
	@Min(0, { message: M.VERSION_MUST_BE_A_NON_NEGATIVE_INTEGER_ERROR })
		version: number;

	@ApiProperty({ description: 'Unique identifier of the command (idempotency), e.g. a UUID v4.', example: 'c-6f1c2b' })
	@IsString({ message: M.INVALID_COMMAND_ID_ERROR })
	@Matches(/^[A-Za-z0-9_-]{1,64}$/, { message: M.INVALID_COMMAND_ID_ERROR })
		commandId: string;
}

/**
 * Comando robar.
 * @class
 */
export class DrawRequest extends TurnCommandRequest {
	@ApiProperty({ enum: ['DECK', 'DISCARD_PILE'] })
	@IsIn(['DECK', 'DISCARD_PILE'])
		source: 'DECK' | 'DISCARD_PILE';
}

/**
 * Discard command. `groups` are indexes of the current hand (without the discarded card) and
 * define how the hand would be settled if another player closes the round (RD-24).
 * @class
 */
export class DiscardRequest extends TurnCommandRequest {
	@ApiProperty({ description: 'Index of the discarded card.', minimum: 0, maximum: 10 })
	@IsInt()
	@Min(0)
	@Max(10)
		card: number;

	@ApiProperty({ required: false, type: 'array', items: { type: 'array', items: { type: 'integer' } }, example: [[0, 1, 2], [3, 4, 5]] })
	@IsOptional()
	@IsArray()
	@ArrayMaxSize(4)
		groups?: number[][];
}

/**
 * Attempt-to-close-the-round command.
 * @class
 */
export class CloseRequest extends TurnCommandRequest {
	@ApiProperty({
		required: false,
		enum: ['WIN_4_3_3', 'KNOCK'],
		default: 'WIN_4_3_3',
		description: 'KNOCK (Apuntado only): 3 threes + 1 leftover worth less than 5 points; opens the extra round.',
	})
	@IsOptional()
	@IsIn(['WIN_4_3_3', 'KNOCK'], { message: M.CLOSE_NOT_ALLOWED })
		type?: 'WIN_4_3_3' | 'KNOCK';

	@ApiProperty({ type: 'array', items: { type: 'array', items: { type: 'integer' } }, example: [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9]] })
	@IsArray()
	@ArrayMaxSize(4)
		groups: number[][];

	@ApiProperty({ description: 'Index of the card discarded when closing.', minimum: 0, maximum: 10 })
	@IsInt()
	@Min(0)
	@Max(10)
		discard: number;
}
