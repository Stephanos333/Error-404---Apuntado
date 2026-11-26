import { ApiProperty } from '@nestjs/swagger';
import { UserDTO } from '../../../domain/user/user';
import { Exclude } from 'class-transformer';
import { DefaultResponse } from '../../../shared/default.response';

/**
 * Data of the controller response.
 *
 * @extends {OmitType(UserDTO, ['password'])}
 * @class
 */
export class GetUserResponseData extends UserDTO {

	@Exclude() password: string;
	@Exclude() cardDesigns: Array<string>;

	constructor(data: UserDTO) {
		super();
		Object.assign(this, data);
	}
}

/**
 * Response when the data of a user
 * is requested.
 *
 * @class
 */
export class GetUserControllerResponse extends DefaultResponse {
	@ApiProperty({ type: GetUserResponseData }) user: GetUserResponseData;
}