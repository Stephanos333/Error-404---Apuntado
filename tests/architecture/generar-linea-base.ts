/**
 * Genera `linea-base.json` con la deuda arquitectónica conocida del prototipo.
 *
 * ¡Atención! La línea base solo debe REDUCIRSE. Regenerarla para aceptar violaciones
 * nuevas anula el propósito de las fitness functions; requiere un ADR aprobado.
 * Uso: npm run linea-base
 */
import * as fs from 'fs';
import { ESLint } from 'eslint';
import * as path from 'path';
import { BACKEND_SRC, COMPLEJIDAD, MOTOR_REGLAS, RAIZ_REPO } from './arquitectura.config';
import { aristasDelCiclo, analizarProyecto, ciclosEnGrafo, grafoDeArchivos, grafoDeModulos } from './support/grafo-dependencias';
import { LineaBase, RUTA_LINEA_BASE } from './support/violaciones';

async function main(): Promise<void> {
	const archivos = analizarProyecto(BACKEND_SRC);
	const grafo = grafoDeModulos(archivos);
	const ciclos = ciclosEnGrafo(grafo).flatMap((c) => aristasDelCiclo(grafo, c));
	const grafoArchivos = grafoDeArchivos(archivos);
	const ciclosArchivos = ciclosEnGrafo(grafoArchivos).flatMap((c) => aristasDelCiclo(grafoArchivos, c));
	const motor = archivos
		.filter((a) => MOTOR_REGLAS.carpetas.includes(a.ruta.split('/')[0]))
		.flatMap((a) => a.externos.filter((p) => MOTOR_REGLAS.paquetesProhibidos.some((r) => r.test(p))).map((p) => `${a.ruta} -> ${p}`));
	const eslint = new ESLint({
		cwd: RAIZ_REPO,
		useEslintrc: false,
		errorOnUnmatchedPattern: false,
		overrideConfig: {
			parser: require.resolve('@typescript-eslint/parser'),
			rules: { complexity: ['error', { max: COMPLEJIDAD.umbral }] },
		},
	});
	const complejidad = (await eslint.lintFiles(COMPLEJIDAD.evaluadores)).flatMap((r) =>
		r.messages.filter((m) => m.ruleId === 'complexity').map((m) => `${path.relative(RAIZ_REPO, r.filePath).split(path.sep).join('/')}:${m.line} ${m.message}`),
	);
	const lineaBase: LineaBase = {
		descripcion: `Deuda arquitectónica conocida del prototipo (generada ${new Date().toISOString().slice(0, 10)}). Solo debe reducirse.`,
		ciclosEntreArchivos: ciclosArchivos,
		ciclosEntreModulos: ciclos,
		motorConFramework: motor,
		complejidad,
	};
	fs.writeFileSync(RUTA_LINEA_BASE, JSON.stringify(lineaBase, null, 2) + '\n');
	console.log(`Línea base: ${ciclosArchivos.length} aristas cíclicas entre archivos, ${ciclos.length} entre módulos, ${motor.length} imports de framework en el motor, ${complejidad.length} métodos sobre CC ${COMPLEJIDAD.umbral}.`);
}

main();
