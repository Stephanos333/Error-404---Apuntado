import { Type } from '@nestjs/common';
import { IEventHandler } from '@nestjs/cqrs';
import { PlayerJoinGameEventHandler } from './player/player-join-game/player-join-game.event-handler';
import { GameReadyToStartEventHandler } from './game-ready-to-start/game-ready-to-start.event-handler';
import { PartidaActualizadaEventHandler } from './partida/partida-actualizada.event-handler';
/**
 * Los manejadores de eventos que notifican por WebSocket.
 * - Sala de espera: ingreso de jugadores y juego listo para iniciar.
 * - Partida: cualquier comando confirmado del agregado `partidas` (ADR-05).
 */
const Events: Type<IEventHandler>[] = [
	PlayerJoinGameEventHandler,
	GameReadyToStartEventHandler,
	PartidaActualizadaEventHandler,
];
export default Events;
