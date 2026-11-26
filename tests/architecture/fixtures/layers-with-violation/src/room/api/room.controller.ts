// Intentional VIOLATION: a controller (presentation) uses the persistence layer directly.
import { MatchSchema } from '../../database/match.schema';
import { model } from 'mongoose';

export class RoomController {
	list(): string {
		return `${MatchSchema.collection}:${typeof model}`;
	}
}
