import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApplicationModule } from '../../application/application.module';
import { PlayerController } from '../controller/player.controller';
/**
 * Module of the players and their
 * configuration.
 * It configures:
 * - The player controllers.
 * The services are provided by the application module.
 */
@Module({
	imports: [ApplicationModule, CqrsModule],
	controllers: [PlayerController],
})
export class PlayerModule {
}
