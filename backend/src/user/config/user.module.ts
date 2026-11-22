import { Module } from '@nestjs/common';
import { AplicacionModule } from '../../aplicacion/aplicacion.module';
import { UserController } from '../controller/user.controller';
import { SecurityModule } from '../../security/config/security.module';
/**
 * Clase que representa el módulo de los usuarios y sus
 * respectivas configuraciones.
 * Configura:
 * - Los controladores de los usuarios.
 * Los servicios los provee el módulo de aplicación; el de sesiones, el de seguridad.
 * @class
 */
@Module({
	imports: [AplicacionModule, SecurityModule],
	controllers: [UserController],
})
export class UserModule {
}
