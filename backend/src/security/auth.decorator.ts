import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtGuard } from './guards/jwt.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

/**
 * Decorator that groups the decorators required to access the application.
 *
 * @const
 */
export const AuthDecorator = () => applyDecorators(
	UseGuards(JwtGuard),
	ApiBearerAuth(),
);