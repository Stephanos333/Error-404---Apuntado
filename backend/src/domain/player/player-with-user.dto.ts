import { ApiProperty } from '@nestjs/swagger';

/**
 * Transfer object of a player
 * with the information of their user.
 * @class
 */
export class PlayerWithUserDTO {
	@ApiProperty() playerId: string;
	@ApiProperty() userId: string;
	@ApiProperty() username: string;
	@ApiProperty() icon: string;
	@ApiProperty() isMarked: boolean;
	@ApiProperty() status: string;
	@ApiProperty() position: number;
	@ApiProperty() score: number;
	@ApiProperty() isActive: boolean;
	@ApiProperty() cardDesignId: string;
	@ApiProperty() cardDesignName: string;
}