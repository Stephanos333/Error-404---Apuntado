/**
 * FF-05 · El motor de reglas es independiente del framework y de la infraestructura
 * (ADR-01 cumplimiento 2, ADR-03, RNF-03 Testabilidad).
 *
 * Los archivos del motor de reglas (prototipo: `card/`; objetivo: `reglas/` y plug-ins)
 * no pueden importar NestJS, Mongoose, Socket.IO ni RxJS: así se prueban de forma aislada,
 * sin levantar la aplicación ni la base de datos.
 */
import * as path from 'path';
import { BACKEND, BACKEND_SRC, MOTOR_REGLAS } from './arquitectura.config';
import { analizarProyecto } from './support/grafo-dependencias';
import { filtrarNuevas, leerLineaBase } from './support/violaciones';

function importsProhibidos(): string[] {
	const enSrc = analizarProyecto(BACKEND_SRC).filter((a) => MOTOR_REGLAS.carpetas.includes(a.ruta.split('/')[0]));
	const enPlugins = analizarProyecto(path.join(BACKEND, 'plugins')).map((a) => ({ ...a, ruta: `plugins/${a.ruta}` }));
	return [...enSrc, ...enPlugins].flatMap((archivo) =>
		archivo.externos
			.filter((paquete) => MOTOR_REGLAS.paquetesProhibidos.some((patron) => patron.test(paquete)))
			.map((paquete) => `${archivo.ruta} -> ${paquete}`),
	);
}

describe('FF-05 El motor de reglas no depende del framework', () => {
	it('no aparecen imports nuevos de NestJS/Mongoose/Socket.IO/RxJS en el motor de reglas', () => {
		const nuevas = filtrarNuevas(importsProhibidos(), leerLineaBase().motorConFramework, 'FF-05');
		expect(nuevas).toEqual([]);
	});
});
