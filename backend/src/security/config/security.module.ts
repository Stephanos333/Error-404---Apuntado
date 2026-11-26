import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApplicationModule } from '../../application/application.module';
import { SessionController } from '../controller/session.controller';
import { SessionService } from '../session.service';
import { LoginStrategy } from '../guards/login.strategy';
import { JwtStrategy } from '../guards/jwt.strategy';
import { GameGuard } from '../guards/game.guard';
/**
 * Security module and its
 * configuration.
 * It configures:
 * - The session controllers.
 * - The session services.
 * - The login strategy.
 * - The guard for the active games.
 * It only depends on the application module (users and games), not on other presentation modules.
 * @class
 */
@Module({
	imports: [
		JwtModule.register({ global: true }),
		ApplicationModule,
	],
	controllers: [SessionController],
	providers: [
		LoginStrategy,
		JwtStrategy,
		SessionService,
		GameGuard,
	],
	exports: [SessionService],
})
export class SecurityModule {
}
