import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/config/user.module';
import { SecurityModule } from './security/config/security.module';
import { CardDesignModule } from './card-design/config/card-design.module';
import { GameModule } from './game/config/game.module';
import { PlayerModule } from './player/config/player.module';
import { MatchModule } from './match/config/match.module';
import { RulePluginsModule } from './rule-plugins.module';
import { MatchPlayModule } from './match-play/config/match-play.module';

/**
 * Main module of the application.\
 * It configures:
 * - The import of the environment variables.
 * - The global registry of rule plug-ins (microkernel, ADR-03).
 * - The users module.
 * - The sessions module.
 * - The card designs module.
 * - The games module.
 * - The players module.
 * @class
 */
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, expandVariables: true }),
		RulePluginsModule,
		UserModule,
		GameModule,
		SecurityModule,
		CardDesignModule,
		PlayerModule,
		MatchModule,
		MatchPlayModule,
	],
})
export class AppModule {
}
