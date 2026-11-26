import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthDecorator } from './auth.decorator';
import { GameGuard } from './guards/game.guard';

/**
 * Decorator that groups the decorators needed
 * to access the resources of a game.
 * @constructor
 */
export const GameAuthDecorator = () => applyDecorators(
	AuthDecorator(),
	UseGuards(GameGuard),
);