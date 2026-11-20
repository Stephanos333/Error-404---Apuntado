import { Module } from '@nestjs/common';
import { AplicacionModule } from '../../aplicacion/aplicacion.module';
import { CardDesignController } from '../controller/card-design.controller';
/**
 * Clase que representa el módulo de los diseños de cartas y sus
 * respectivas configuraciones.
 * Configura:
 * - Los controladores de los diseños de cartas.
 * Los servicios los provee el módulo de aplicación.
 */
@Module({
	imports: [AplicacionModule],
	controllers: [CardDesignController],
})
export class CardDesignModule {
}
