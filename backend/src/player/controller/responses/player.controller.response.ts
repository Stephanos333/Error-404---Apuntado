import { ApiProperty } from '@nestjs/swagger';
import { PlayerDTO } from '../../../domain/player/player';
import { DefaultResponse } from '../../../shared/default.response';

/**
 * Default response of the player controller.
 */
export class PlayerControllerResponse extends DefaultResponse {
	@ApiProperty({ type: PlayerDTO }) player: PlayerDTO;
	@ApiProperty() currentDesignName: string;
}