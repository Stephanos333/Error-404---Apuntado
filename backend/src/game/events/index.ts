import { Type } from '@nestjs/common';
import { IEventHandler } from '@nestjs/cqrs';
import { PlayerJoinGameEventHandler } from './player/player-join-game/player-join-game.event-handler';
import { GameReadyToStartEventHandler } from './game-ready-to-start/game-ready-to-start.event-handler';
import { MatchUpdatedEventHandler } from './match/match-updated.event-handler';
/**
 * The event handlers that notify through WebSocket.
 * - Waiting room: players joining and game ready to start.
 * - Match: any confirmed command of the `matches` aggregate (ADR-05).
 */
const Events: Type<IEventHandler>[] = [
	PlayerJoinGameEventHandler,
	GameReadyToStartEventHandler,
	MatchUpdatedEventHandler,
];
export default Events;
