import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { MatchController } from '../controller/match.controller';
/**
 * Module of the matches and their configuration.\
 * It configures:
 * - The match controllers.
 * The services are provided by the application module.
 * @class
 * @module
 */
@Module({
	imports: [ApplicationModule],
	controllers: [MatchController],
})
export class MatchModule {
}
