import { DefaultResponse } from '../../../shared/default.response';
import { ApiProperty } from '@nestjs/swagger';
import { GameDTO } from '../../../dominio/game/game';
import { PlayerWithUserDTO } from '../../../dominio/player/player-with-user.dto';
import { VistaPublicaPartida } from '../../../dominio/partida/vistas-partida';

export class GetCurrentGameControllerResponse extends DefaultResponse {
	@ApiProperty({ type: GameDTO }) game: GameDTO;
	@ApiProperty({ type: [PlayerWithUserDTO] }) players: Array<PlayerWithUserDTO>;
	@ApiProperty({ type: Object, required: false, description: 'Vista pública de la partida en curso (sin cartas privadas).' })
		partida?: VistaPublicaPartida;
}
