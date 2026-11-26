import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';
import { GameDTO } from '../../../domain/game/game';

/**
 * Response of the controller that fetches
 * the public games.
 * @class
 * @extends {DefaultResponse}
 */
export class GetPublicGamesControllerResponse extends DefaultResponse {
	@ApiProperty({ type: [GameDTO] }) data: Array<GameDTO>;
}