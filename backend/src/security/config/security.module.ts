import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AplicacionModule } from '../../aplicacion/aplicacion.module';
import { SessionController } from '../controller/session.controller';
import { SessionService } from '../session.service';
import { LoginStrategy } from '../guards/login.strategy';
import { JwtStrategy } from '../guards/jwt.strategy';
import { GameGuard } from '../guards/game.guard';
/**
 * Clase que representa el módulo de seguridad y sus
 * respectivas configuraciones.
 * Configura:
 * - Los controladores de las sesiones.
 * - Los servicios de las sesiones.
 * - La estrategía para el inicio de sesión.
 * - La guardia para los juegos activos.
 * Solo depende del módulo de aplicación (usuarios y juegos), no de otros módulos de presentación.
 * @class
 */
@Module({
	imports: [
		JwtModule.register({ global: true }),
		AplicacionModule,
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
