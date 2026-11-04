/**
 * FF-01 · Aislamiento de capas (ADR-01, ADR-04, gobernanza §5.1 regla 1).
 *
 * La capa de presentación (controladores REST y gateways WebSocket) no puede acceder
 * directamente a la persistencia (esquemas/modelos Mongoose ni drivers de base de datos):
 * siempre pasa por los servicios de aplicación / orquestador.
 */
import 'tsarch/dist/jest';
import * as path from 'path';
import { filesOfProject } from 'tsarch';
import { BACKEND_SRC, BACKEND_TSCONFIG, CAPAS, FIXTURES } from './arquitectura.config';
import { analizarProyecto } from './support/grafo-dependencias';
import { carpeta, describirViolacionTsArch } from './support/violaciones';

async function violacionesCapas(raizCodigo: string, tsconfig: string): Promise<string[]> {
	const resultado: string[] = [];
	for (const presentacion of CAPAS.presentacion) {
		for (const persistencia of CAPAS.persistencia) {
			const v = await filesOfProject(tsconfig)
				.matchingPattern(carpeta(presentacion))
				.shouldNot()
				.dependOnFiles()
				.matchingPattern(carpeta(persistencia))
				.check();
			resultado.push(...v.map(describirViolacionTsArch));
		}
	}
	// Dependencias a paquetes externos de acceso a datos (TSArch solo ve archivos del proyecto).
	for (const archivo of analizarProyecto(raizCodigo)) {
		if (!CAPAS.presentacion.some((capa) => archivo.ruta.split('/').includes(capa))) continue;
		for (const paquete of archivo.externos) {
			if (CAPAS.paquetesPersistencia.some((patron) => patron.test(paquete))) resultado.push(`${archivo.ruta} -> ${paquete}`);
		}
	}
	return resultado;
}

describe('FF-01 Aislamiento de capas: la presentación no accede a la persistencia', () => {
	it('backend real: controladores y gateways no importan persistencia ni mongoose', async () => {
		expect(await violacionesCapas(BACKEND_SRC, BACKEND_TSCONFIG)).toEqual([]);
	});

	it('meta-prueba: detecta un controlador que importa un esquema y mongoose', async () => {
		const raiz = path.join(FIXTURES, 'capas-con-violacion');
		expect(await violacionesCapas(path.join(raiz, 'src'), path.join(raiz, 'tsconfig.json'))).toEqual([
			'src/sala/api/sala.controller.ts -> src/database/partida.schema.ts',
			'sala/api/sala.controller.ts -> mongoose',
		]);
	});
});
