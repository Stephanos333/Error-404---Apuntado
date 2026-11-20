import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../database/database.module';
import { CardDesignService } from './card-design/card-design.service';
import { UserService } from './user/user.service';
import { PlayerService } from './player/player.service';
import { MatchService } from './match/match.service';
import { GameService } from './game/game.service';

/**
 * Módulo de la capa de aplicación.
 *
 * Agrupa los servicios de aplicación (casos de uso) y los expone a los módulos de
 * presentación (controladores, gateways y guardias). Depende solo de la persistencia,
 * del dominio y del motor de reglas; ningún módulo de presentación es importado aquí,
 * por eso las dependencias entre módulos forman un grafo acíclico (FF-03).
 *
 * El registro de reglas (`RegistroReglas`) lo provee el módulo global de plug-ins
 * definido en la raíz de composición (`reglas-plugins.module.ts`).
 * @class
 */
@Module({
	imports: [DatabaseModule, CqrsModule],
	providers: [CardDesignService, UserService, PlayerService, MatchService, GameService],
	exports: [CardDesignService, UserService, PlayerService, MatchService, GameService],
})
export class AplicacionModule {}
