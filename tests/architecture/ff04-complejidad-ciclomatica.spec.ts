/**
 * FF-04 · Límite de complejidad ciclomática (gobernanza §5.1 regla 3, §5.3).
 *
 * Ningún método evaluador de combinaciones de cartas puede superar CC = 10.
 * La complejidad la calcula ESLint (regla `complexity`): 1 + número de puntos de decisión
 * (if, else if, for, while, case, catch, &&, ||, ??, ?:).
 */
import { ESLint } from 'eslint';
import * as path from 'path';
import { COMPLEJIDAD, FIXTURES, RAIZ_REPO } from './arquitectura.config';
import { filtrarNuevas, leerLineaBase } from './support/violaciones';

async function metodosQueSuperan(patrones: string[], umbral: number, cwd = RAIZ_REPO): Promise<string[]> {
	const eslint = new ESLint({
		cwd,
		useEslintrc: false,
		errorOnUnmatchedPattern: false,
		overrideConfig: {
			parser: require.resolve('@typescript-eslint/parser'),
			parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
			rules: { complexity: ['error', { max: umbral }] },
		},
	});
	const resultados = await eslint.lintFiles(patrones);
	return resultados.flatMap((r) =>
		r.messages
			.filter((m) => m.ruleId === 'complexity')
			.map((m) => `${path.relative(cwd, r.filePath).split(path.sep).join('/')}:${m.line} ${m.message}`),
	);
}

describe('FF-04 Complejidad ciclomática', () => {
	it(`ningún método evaluador de combinaciones supera CC ${COMPLEJIDAD.umbral}`, async () => {
		const actuales = await metodosQueSuperan(COMPLEJIDAD.evaluadores, COMPLEJIDAD.umbral);
		expect(filtrarNuevas(actuales, leerLineaBase().complejidad, 'FF-04')).toEqual([]);
	});

	it(`informativo: ningún método del backend supera CC ${COMPLEJIDAD.umbralGeneral}`, async () => {
		expect(await metodosQueSuperan(['backend/src/**/*.ts'], COMPLEJIDAD.umbralGeneral)).toEqual([]);
	});

	it('meta-prueba: detecta un evaluador con CC 12 y acepta uno con CC bajo', async () => {
		const cwd = path.join(FIXTURES, 'complejidad');
		const marcados = await metodosQueSuperan(['*.ts'], COMPLEJIDAD.umbral, cwd);
		expect(marcados).toHaveLength(1);
		expect(marcados[0]).toMatch(/^evaluador-complejo\.ts:\d+ .*esCombinacionValida.* complexity of 12/);
	});
});
