import { Module } from '@nestjs/common';
import { AplicacionModule } from '../../aplicacion/aplicacion.module';
import { MatchController } from '../controller/match.controller';
/**
 * Clase que representa el módulo de las partidas y sus respectivas configuraciones.\
 * Configura:
 * - Los controladores de las partidas.
 * Los servicios los provee el módulo de aplicación.
 * @class
 * @module
 */
@Module({
	imports: [AplicacionModule],
	controllers: [MatchController],
})
export class MatchModule {
}
