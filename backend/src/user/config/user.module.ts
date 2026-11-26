import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import { UserController } from '../controller/user.controller';
import { SecurityModule } from '../../security/config/security.module';
/**
 * Module of the users and their
 * configuration.
 * It configures:
 * - The user controllers.
 * The services are provided by the application module; the session ones by the security module.
 * @class
 */
@Module({
	imports: [ApplicationModule, SecurityModule],
	controllers: [UserController],
})
export class UserModule {
}
