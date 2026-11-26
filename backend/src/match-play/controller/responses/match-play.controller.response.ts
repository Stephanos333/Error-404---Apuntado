import { ApiProperty } from '@nestjs/swagger';
import { DefaultResponse } from '../../../shared/default.response';
import { PrivateMatchView, PublicMatchView } from '../../../domain/match/match-views';

/**
 * Match response: public view and the hand of the requesting user.
 * @class
 */
export class MatchPlayControllerResponse extends DefaultResponse {
	@ApiProperty({ description: '`false` if the command had already been applied (idempotent resend).' }) applied: boolean;
	@ApiProperty({ type: Object, description: 'Public view: no cards of the hands and no content of the deck.' }) match: PublicMatchView;
	@ApiProperty({ type: Object, nullable: true, description: 'The hand of the authenticated user.' }) hand: PrivateMatchView | null;
}
