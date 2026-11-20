import { Global, Module } from '@nestjs/common';
import { RegistroReglas } from './reglas/registro/registro-reglas';
import { ReglaClasicaPlugin } from '../plugins/clasica';
import { ParametrosApuntado, ReglaApuntadoPlugin } from '../plugins/apuntado';

/**
 * Lee un número de una variable de entorno; si no existe o no es numérica devuelve `undefined`.
 * @param {string} [valor] El valor de la variable.
 * @returns {number | undefined} El número leído.
 */
function leerNumero(valor?: string): number | undefined {
	if (valor === undefined || valor.trim() === '') return undefined;
	const numero: number = Number(valor);
	return Number.isFinite(numero) ? numero : undefined;
}

/**
 * Parámetros de la modalidad Apuntado tomados del entorno. Los que no estén definidos
 * conservan el valor por defecto del plug-in.
 * @param {NodeJS.ProcessEnv} env Las variables de entorno.
 * @returns {Partial<ParametrosApuntado>} Los parámetros definidos.
 */
function parametrosApuntado(env: NodeJS.ProcessEnv): Partial<ParametrosApuntado> {
	const leidos: Partial<ParametrosApuntado> = {
		bonificacionCierre: leerNumero(env.APP_BONUS_POINTS),
		castigoCierreFalso: leerNumero(env.APP_FALSE_WIN_PENALTY_POINTS),
	};
	return Object.fromEntries(Object.entries(leidos).filter(([, v]) => v !== undefined));
}

/**
 * Raíz de composición del microkernel (ADR-03).
 *
 * Es el único lugar del backend que conoce los plug-ins concretos. Los registra en el
 * `RegistroReglas`, que valida su contrato al arrancar; si un plug-in es incompatible
 * la aplicación no inicia. El núcleo (servicios de aplicación) solo recibe el registro.
 * Para agregar una modalidad basta con crear su paquete en `backend/plugins/<id>/` y
 * registrarlo aquí; el orquestador no cambia.
 * @param {NodeJS.ProcessEnv} [env=process.env] Las variables de entorno.
 * @returns {RegistroReglas} El registro con las reglas habilitadas.
 */
export function crearRegistroReglas(env: NodeJS.ProcessEnv = process.env): RegistroReglas {
	const registro: RegistroReglas = new RegistroReglas();
	// Apuntado es la predeterminada: conserva el comportamiento de los juegos creados antes del MVP.
	registro.registrar(new ReglaApuntadoPlugin(parametrosApuntado(env)), { predeterminada: true });
	registro.registrar(new ReglaClasicaPlugin());
	return registro;
}

/**
 * Módulo global que provee el registro de reglas a toda la aplicación.
 * @class
 */
@Global()
@Module({
	providers: [{ provide: RegistroReglas, useFactory: () => crearRegistroReglas() }],
	exports: [RegistroReglas],
})
export class ReglasPluginsModule {}
