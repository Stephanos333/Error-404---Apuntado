import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';
import { GameDTO } from '../../../domain/game/game';

/**
 * Response of the controller that creates a game.
 * @class
 * @extends DefaultResponse
 */
export class GameControllerResponse extends DefaultResponse {
	@ApiProperty({ type: GameDTO }) data: GameDTO;
}