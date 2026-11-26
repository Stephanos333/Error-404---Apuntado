import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../database/database.module';
import { CardDesignService } from './card-design/card-design.service';
import { UserService } from './user/user.service';
import { PlayerService } from './player/player.service';
import { GameService } from './game/game.service';
import { TurnOrchestrator } from './match/turn-orchestrator.service';
import { SHUFFLER, SecureShuffler } from '../domain/match/match-cards';

/**
 * Application layer module.
 *
 * Groups the application services (use cases) and exposes them to the presentation
 * modules (controllers, gateways and guards). It only depends on persistence, the domain
 * and the rule engine; no presentation module is imported here, which is why the
 * dependencies between modules form an acyclic graph (FF-03).
 *
 * The rule registry (`RuleRegistry`) and the system parameters are provided by the global
 * module of the composition root (`rule-plugins.module.ts`).
 * @class
 */
@Module({
	imports: [DatabaseModule, CqrsModule],
	providers: [
		CardDesignService,
		UserService,
		PlayerService,
		GameService,
		TurnOrchestrator,
		{ provide: SHUFFLER, useClass: SecureShuffler },
	],
	exports: [CardDesignService, UserService, PlayerService, GameService, TurnOrchestrator],
})
export class ApplicationModule {}
