/**
 * FF-02 · Independencia de los plug-ins de reglas (ADR-03, gobernanza §5.1 regla 2).
 *
 *  a) Un plug-in de reglas (Clásica, Apuntado, ...) no depende de otro plug-in.
 *  b) El núcleo (juego, puntaje, sala) no conoce plug-ins concretos: solo el contrato.
 *  c) Un plug-in solo depende de sí mismo, del contrato y del evaluador de manos.
 *  d) No hay ciclos dentro de la carpeta de plug-ins.
 *
 * El prototipo actual todavía no tiene plug-ins; por eso la regla se verifica con dos
 * proyectos de ejemplo (fixtures): uno conforme y uno con violaciones (meta-pruebas que
 * demuestran que la regla detecta lo que dice detectar). Sobre el backend real se activa
 * automáticamente cuando exista `backend/plugins/` (refactorización de ADR-03).
 */
import 'tsarch/dist/jest';
import * as fs from 'fs';
import * as path from 'path';
import { filesOfProject } from 'tsarch';
import { BACKEND, BACKEND_TSCONFIG, FIXTURES, MICROKERNEL } from './arquitectura.config';
import { analizarProyecto } from './support/grafo-dependencias';
import { carpeta, describirViolacionTsArch } from './support/violaciones';

const DEPENDENCIAS_PERMITIDAS_PLUGIN = ['src/reglas/contrato/', 'src/reglas/evaluador/'];

async function violacionesMicrokernel(raizProyecto: string, tsconfig: string): Promise<string[]> {
	const { plugins, nombresPlugins, nucleo } = MICROKERNEL;
	const resultado: string[] = [];

	// a) plug-in -> otro plug-in
	for (const origen of nombresPlugins) {
		for (const destino of nombresPlugins.filter((n) => n !== origen)) {
			const v = await filesOfProject(tsconfig)
				.matchingPattern(carpeta(`${plugins}/${origen}`))
				.shouldNot()
				.dependOnFiles()
				.matchingPattern(carpeta(`${plugins}/${destino}`))
				.check();
			resultado.push(...v.map((x) => `plugin->plugin: ${describirViolacionTsArch(x)}`));
		}
	}
	// b) núcleo -> plug-in concreto
	for (const modulo of nucleo) {
		const v = await filesOfProject(tsconfig).matchingPattern(carpeta(modulo)).shouldNot().dependOnFiles().matchingPattern(carpeta(plugins)).check();
		resultado.push(...v.map((x) => `nucleo->plugin: ${describirViolacionTsArch(x)}`));
	}
	// c) un plug-in solo depende de sí mismo, del contrato y del evaluador
	for (const archivo of analizarProyecto(raizProyecto).filter((a) => a.ruta.startsWith(`${plugins}/`))) {
		const propio = archivo.ruta.split('/').slice(0, 2).join('/') + '/';
		for (const dep of archivo.internos) {
			if (!dep.startsWith(propio) && !DEPENDENCIAS_PERMITIDAS_PLUGIN.some((p) => dep.startsWith(p))) {
				resultado.push(`plugin->no permitido: ${archivo.ruta} -> ${dep}`);
			}
		}
	}
	// d) sin ciclos entre archivos de plug-ins
	const ciclos = await filesOfProject(tsconfig).matchingPattern(carpeta(plugins)).should().beFreeOfCycles().check();
	resultado.push(...ciclos.map((x) => `ciclo: ${describirViolacionTsArch(x)}`));
	return resultado;
}

describe('FF-02 Independencia de los plug-ins de reglas (microkernel)', () => {
	it('meta-prueba: un proyecto conforme al ADR-03 no tiene violaciones', async () => {
		const raiz = path.join(FIXTURES, 'microkernel-conforme');
		expect(await violacionesMicrokernel(raiz, path.join(raiz, 'tsconfig.json'))).toEqual([]);
	});

	it('meta-prueba: detecta plug-in que importa a otro plug-in y núcleo que importa un plug-in', async () => {
		const raiz = path.join(FIXTURES, 'microkernel-con-violaciones');
		const violaciones = await violacionesMicrokernel(raiz, path.join(raiz, 'tsconfig.json'));
		expect(violaciones).toEqual(
			expect.arrayContaining([
				'plugin->plugin: plugins/apuntado/regla-apuntado.ts -> plugins/clasica/regla-clasica.ts',
				'nucleo->plugin: src/juego/orquestador-turnos.ts -> plugins/clasica/regla-clasica.ts',
				'plugin->no permitido: plugins/apuntado/regla-apuntado.ts -> plugins/clasica/regla-clasica.ts',
			]),
		);
	});

	const hayPlugins = fs.existsSync(path.join(BACKEND, MICROKERNEL.plugins));
	(hayPlugins ? it : it.skip)('backend real: los plug-ins son independientes y el núcleo solo conoce el contrato', async () => {
		expect(await violacionesMicrokernel(BACKEND, BACKEND_TSCONFIG)).toEqual([]);
	});
});
