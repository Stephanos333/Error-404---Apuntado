import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AplicacionModule } from '../../aplicacion/aplicacion.module';
import { GameController } from '../controller/game.controller';
import { GameSocket } from '../socket/game.socket';
import Events from '../events';
/**
 * Clase que representa el módulo de los juegos y sus respectivas
 * configuraciones.
 * Configura:
 * - Los controladores de los juegos.
 * - El gateway WebSocket de los juegos y los manejadores de eventos que lo notifican.
 * Los servicios los provee el módulo de aplicación.
 * @class
 */
@Module({
	imports: [AplicacionModule, CqrsModule],
	controllers: [GameController],
	providers: [GameSocket, ...Events],
})
export class GameModule {
}
