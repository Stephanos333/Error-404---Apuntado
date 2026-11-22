import { Module } from '@nestjs/common';
import { AplicacionModule } from '../../aplicacion/aplicacion.module';
import { PartidaController } from '../controller/partida.controller';

/**
 * Módulo de presentación de la partida (comandos de turno y estado).
 * El orquestador lo provee el módulo de aplicación.
 * @class
 */
@Module({
	imports: [AplicacionModule],
	controllers: [PartidaController],
})
export class PartidaModule {}
