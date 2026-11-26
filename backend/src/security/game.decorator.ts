import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDecoratorType } from './user.decorator';

/**
 * Decorator that extracts the game information from the request after
 * the guard has validated it.
 * @const
 */
export const GameDecorator = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): UserDecoratorType => {
		switch (ctx.getType()) {
		case 'http': {
			const request = ctx.switchToHttp().getRequest();
			return request.game;
		}
		case 'ws': {
			const query = ctx.switchToWs().getClient().handshake.query;
			return JSON.parse(query.game);
		}
		}
	},
);