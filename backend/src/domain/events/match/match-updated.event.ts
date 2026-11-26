import { Match } from '../../match/match';
import { MatchEvent } from '../../match/match-commands';

/**
 * Local domain event (ADR-05) that the orchestrator publishes ONLY after the commit.
 * It carries the confirmed state; the subscribers (real-time notification) build the
 * filtered views and cannot change the result of the command.
 */
export class MatchUpdatedEvent {
	/**
	 * @param {string} roomId The id of the game (room) the match belongs to.
	 * @param {Match} match The confirmed state of the match.
	 * @param {MatchEvent[]} events The domain events of the command, in order.
	 */
	constructor(
		public readonly roomId: string,
		public readonly match: Match,
		public readonly events: ReadonlyArray<MatchEvent>,
	) {}
}
