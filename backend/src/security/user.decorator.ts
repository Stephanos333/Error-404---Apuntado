import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Information extracted by the user decorator.
 * @type { userId: string }
 */
export type UserDecoratorType = { userId: string; }

/**
 * Decorator that extracts the user information from the request after
 * the token has been validated.
 * @const
 */
export const UserDecorator = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): UserDecoratorType => {
		switch (ctx.getType()) {
		case 'http': {
			const request = ctx.switchToHttp().getRequest();
			return request.user;
		}
		case 'ws': {
			const query = ctx.switchToWs().getClient().handshake.query;
			return JSON.parse(query.user);
		}
		}
	},
);