import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';
import { GameDTO } from '../../../domain/game/game';
import { PlayerWithUserDTO } from '../../../domain/player/player-with-user.dto';
import { PublicMatchView } from '../../../domain/match/match-views';

export class GetCurrentGameControllerResponse extends DefaultResponse {
	@ApiProperty({ type: GameDTO }) game: GameDTO;
	@ApiProperty({ type: [PlayerWithUserDTO] }) players: Array<PlayerWithUserDTO>;
	@ApiProperty({ type: Object, required: false, description: 'Public view of the match in progress (no private cards).' })
		match?: PublicMatchView;
}
