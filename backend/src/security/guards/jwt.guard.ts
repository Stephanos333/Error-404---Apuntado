import { AuthGuard } from '@nestjs/passport';
import { ContextType, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtSocketStrategy } from './jwt.socket.strategy';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '../../shared/exceptions/unauthorized.exception';

/**
 * Logic of the jwt guard for the different execution contexts
 * of the system
 *
 * @class
 * @extends {AuthGuard('jwt')}
 */
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {

	/**
	 * @param {JwtService} service Service to interact with jwt.
	 */
	constructor(private readonly service: JwtService) {
		super();
	}

	/**
	 * Main function of the guard logic.
	 * @param {ExecutionContext} context The execution context.
	 * @throws {UnauthorizedException} When the user has no access to the resource.
	 */
	canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
		let result: boolean;
		switch (context.getType<ContextType>()) {
		case 'http':
			return super.canActivate(context);
		case 'ws':
			result = JwtSocketStrategy.canActivate(context, this.service);
			break;
		default:
			result = false;
		}
		if (!result) throw new UnauthorizedException();
		return result;
	}
}