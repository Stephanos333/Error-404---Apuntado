import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { MatchPlayController } from '../controller/match-play.controller';

/**
 * Presentation module of the match (turn commands and state).
 * The orchestrator is provided by the application module.
 * @class
 */
@Module({
	imports: [ApplicationModule],
	controllers: [MatchPlayController],
})
export class MatchPlayModule {}
