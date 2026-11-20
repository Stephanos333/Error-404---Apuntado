import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';
import { GameDTO } from '../../../dominio/game/game';
import { PlayerWithUserDTO } from '../../../dominio/player/player-with-user.dto';
import { DiscardedCardsDTO } from '../../../dominio/match/discarded-cards';

export class GetCurrentGameControllerResponse extends DefaultResponse {
	@ApiProperty({ type: GameDTO }) game: GameDTO;
	@ApiProperty({ type: [PlayerWithUserDTO] }) players: Array<PlayerWithUserDTO>;
	@ApiProperty({ type: DiscardedCardsDTO }) discardedCards?: DiscardedCardsDTO;
}