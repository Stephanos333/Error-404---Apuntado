import { IEvent } from '@nestjs/cqrs';
import { GameId } from '../../../game/game-id';

/**
 * Evento que indica que una partida fue ganada.
 */
export class MatchWonEvent implements IEvent {
	constructor(public readonly game: GameId) {}
}
