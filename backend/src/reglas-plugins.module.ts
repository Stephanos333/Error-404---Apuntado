import { Global, Module } from '@nestjs/common';
import { RegistroReglas } from './reglas/registro/registro-reglas';
import { ReglaClasicaPlugin } from '../plugins/clasica';
import { ParametrosApuntado, ReglaApuntadoPlugin } from '../plugins/apuntado';
import { ParametrosPartida } from './dominio/partida/partida';
import { PARAMETROS_SISTEMA, PARAMETROS_SISTEMA_POR_DEFECTO } from './aplicacion/partida/parametros-sistema';

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
 * Parámetros del sistema (PS) que se congelan en cada partida (RD-36). Las variables de
 * entorno del prototipo reemplazan los valores por defecto.
 * @param {NodeJS.ProcessEnv} env Las variables de entorno.
 * @returns {ParametrosPartida} Los parámetros.
 */
export function leerParametrosSistema(env: NodeJS.ProcessEnv = process.env): ParametrosPartida {
	const bonificacion = leerNumero(env.APP_BONUS_POINTS);
	return {
		...PARAMETROS_SISTEMA_POR_DEFECTO,
		castigoCierreInvalido: leerNumero(env.APP_FALSE_WIN_PENALTY_POINTS) ?? PARAMETROS_SISTEMA_POR_DEFECTO.castigoCierreInvalido,
		// En el esquema la bonificación es negativa (PS-04); la variable del prototipo es positiva.
		bonificacionCierre: bonificacion === undefined ? PARAMETROS_SISTEMA_POR_DEFECTO.bonificacionCierre : -Math.abs(bonificacion),
	};
}

/**
 * Parámetros del plug-in Apuntado derivados de los parámetros del sistema, para que la
 * regla y la configuración congelada en la partida coincidan.
 * @param {ParametrosPartida} sistema Los parámetros del sistema.
 * @returns {ParametrosApuntado} Los parámetros del plug-in.
 */
function parametrosApuntado(sistema: ParametrosPartida): ParametrosApuntado {
	return {
		limiteEliminacion: sistema.limiteEliminacion,
		limiteVictoria: sistema.umbralVictoriaNegativa,
		umbralTocar: sistema.umbralTocar,
		bonificacionCierre: Math.abs(sistema.bonificacionCierre),
		castigoCierreFalso: sistema.castigoCierreInvalido,
	};
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
	registro.registrar(new ReglaApuntadoPlugin(parametrosApuntado(leerParametrosSistema(env))), { predeterminada: true });
	registro.registrar(new ReglaClasicaPlugin());
	return registro;
}

/**
 * Módulo global que provee el registro de reglas y los parámetros del sistema.
 * @class
 */
@Global()
@Module({
	providers: [
		{ provide: RegistroReglas, useFactory: () => crearRegistroReglas() },
		{ provide: PARAMETROS_SISTEMA, useFactory: () => leerParametrosSistema() },
	],
	exports: [RegistroReglas, PARAMETROS_SISTEMA],
})
export class ReglasPluginsModule {}
