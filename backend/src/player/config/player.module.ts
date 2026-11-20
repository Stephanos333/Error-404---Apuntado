import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AplicacionModule } from '../../aplicacion/aplicacion.module';
import { PlayerController } from '../controller/player.controller';
/**
 * Clase que representa el módulo de los jugadores y sus respectivas
 * configuraciones.
 * Configura:
 * - Los controladores de los jugadores.
 * Los servicios los provee el módulo de aplicación.
 */
@Module({
	imports: [AplicacionModule, CqrsModule],
	controllers: [PlayerController],
})
export class PlayerModule {
}
