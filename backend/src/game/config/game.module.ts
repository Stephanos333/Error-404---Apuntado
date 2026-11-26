import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApplicationModule } from '../../application/application.module';
import { GameController } from '../controller/game.controller';
import { GameSocket } from '../socket/game.socket';
import Events from '../events';
/**
 * Module of the games and their
 * configuration.
 * It configures:
 * - The game controllers.
 * - The WebSocket gateway of the games and the event handlers that notify through it.
 * The services are provided by the application module.
 * @class
 */
@Module({
	imports: [ApplicationModule, CqrsModule],
	controllers: [GameController],
	providers: [GameSocket, ...Events],
})
export class GameModule {
}
