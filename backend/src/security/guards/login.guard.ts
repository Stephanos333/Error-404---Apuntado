import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

/**
 * Guard for the user login.
 * @class
 * @extends {AuthGuard('local')}
 */
@Injectable()
export class LoginGuard extends AuthGuard('local') {
}