/**
 * Métricas estructurales del backend (Richards & Ford, 2025, cap. 3; Martin, 1994).
 *
 * Calcula, sin compilar ni ejecutar el backend:
 *  - Complejidad ciclomática (CC) de cada función y método, con la regla `complexity` de ESLint
 *    (la misma que usa FF-04).
 *  - Por componente: acoplamiento aferente (Ca), eferente (Ce), inestabilidad
 *    I = Ce / (Ca + Ce), abstracción A = Na / (Na + Nc) y distancia a la secuencia principal
 *    D = |A + I - 1|.
 *
 * Definiciones operativas (documentadas en docs/capitulo-4-cicd-metricas.md):
 *  - Componente: `src/<módulo>`; en las capas `aplicacion/`, `dominio/` y `reglas/`, el
 *    subcomponente `src/<capa>/<módulo>`; cada plug-in `plugins/<id>`. Los archivos sueltos de
 *    `src/` forman `src/(raiz)` (main, app.module y la raíz de composición de los plug-ins).
 *  - Ca: componentes distintos que importan algún archivo del componente.
 *    Ce: componentes distintos de los que el componente importa algo (estilo JDepend).
 *    Solo cuentan los imports entre archivos del backend; los paquetes npm se informan aparte.
 *  - Na: interfaces y clases abstractas. Nc: clases concretas y funciones de nivel de módulo
 *    (declaradas o asignadas a una constante). Los alias `type` y los `enum` no cuentan.
 *  - Se excluyen las pruebas (`*.spec.ts`) y `backend/test/`.
 *
 * Uso: npm run metricas  (escribe docs/metricas/metricas-arquitectura.{json,md})
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { ESLint } from 'eslint';
import { BACKEND, COMPLEJIDAD, RAIZ_REPO } from './arquitectura.config';
import { analizarProyecto } from './support/grafo-dependencias';

const SALIDA = path.join(RAIZ_REPO, 'docs', 'metricas');
const CAPAS_CON_SUBCOMPONENTES = ['aplicacion', 'dominio', 'reglas'];
/** Umbral orientativo de D para señalar un componente alejado de la secuencia principal. */
const UMBRAL_DISTANCIA = 0.5;

interface MetricaComponente {
	componente: string;
	archivos: number;
	ca: number;
	ce: number;
	inestabilidad: number;
	abstractos: number;
	concretos: number;
	abstraccion: number;
	distancia: number;
	zona: 'secuencia principal' | 'zona de dolor' | 'zona de inutilidad';
	dependeDe: string[];
	usadoPor: string[];
	paquetesExternos: number;
}

interface MedicionCC {
	archivo: string;
	linea: number;
	funcion: string;
	cc: number;
}

interface ResumenCC {
	alcance: string;
	funciones: number;
	media: number;
	mediana: number;
	p90: number;
	maxima: number;
	sobreUmbral: number;
	umbral: number;
	top: MedicionCC[];
}

const redondear = (n: number, d = 2): number => Math.round(n * 10 ** d) / 10 ** d;

/** Componente al que pertenece un archivo (ruta relativa a backend/). */
export function componenteDe(ruta: string): string {
	const p = ruta.split('/');
	if (p[0] === 'plugins') return p.length > 2 ? `plugins/${p[1]}` : 'plugins/(raiz)';
	if (p.length === 2) return 'src/(raiz)';
	if (CAPAS_CON_SUBCOMPONENTES.includes(p[1]) && p.length > 3) return `src/${p[1]}/${p[2]}`;
	return `src/${p[1]}`;
}

/** Cuenta los elementos abstractos y concretos declarados en el nivel de módulo de un archivo. */
function contarElementos(archivo: string): { abstractos: number; concretos: number } {
	const fuente = ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.ES2022, true);
	let abstractos = 0;
	let concretos = 0;
	const esFuncion = (e?: ts.Expression) => !!e && (ts.isArrowFunction(e) || ts.isFunctionExpression(e));
	for (const sentencia of fuente.statements) {
		if (ts.isInterfaceDeclaration(sentencia)) abstractos++;
		else if (ts.isClassDeclaration(sentencia)) {
			const abstracta = ts.getModifiers(sentencia)?.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword);
			if (abstracta) abstractos++;
			else concretos++;
		} else if (ts.isFunctionDeclaration(sentencia)) concretos++;
		else if (ts.isVariableStatement(sentencia)) {
			concretos += sentencia.declarationList.declarations.filter((d) => esFuncion(d.initializer)).length;
		}
	}
	return { abstractos, concretos };
}

function zonaDe(a: number, i: number, d: number): MetricaComponente['zona'] {
	if (d <= UMBRAL_DISTANCIA) return 'secuencia principal';
	return a + i < 1 ? 'zona de dolor' : 'zona de inutilidad';
}

/** Ca, Ce, I, A y D por componente. */
export function metricasDeComponentes(): MetricaComponente[] {
	const archivos = analizarProyecto(BACKEND, BACKEND).filter((a) => a.ruta.startsWith('src/') || a.ruta.startsWith('plugins/'));
	const salientes = new Map<string, Set<string>>();
	const entrantes = new Map<string, Set<string>>();
	const externos = new Map<string, Set<string>>();
	const conteo = new Map<string, { archivos: number; abstractos: number; concretos: number }>();
	const asegurar = (c: string) => {
		if (!salientes.has(c)) {
			salientes.set(c, new Set());
			entrantes.set(c, new Set());
			externos.set(c, new Set());
			conteo.set(c, { archivos: 0, abstractos: 0, concretos: 0 });
		}
	};
	for (const a of archivos) {
		const origen = componenteDe(a.ruta);
		asegurar(origen);
		const elementos = contarElementos(path.join(BACKEND, a.ruta));
		const c = conteo.get(origen)!;
		c.archivos++;
		c.abstractos += elementos.abstractos;
		c.concretos += elementos.concretos;
		a.externos.forEach((p) => externos.get(origen)!.add(p));
		for (const destinoRuta of a.internos) {
			const destino = componenteDe(destinoRuta);
			if (destino === origen) continue;
			asegurar(destino);
			salientes.get(origen)!.add(destino);
			entrantes.get(destino)!.add(origen);
		}
	}
	return [...conteo.keys()].sort().map((componente) => {
		const ca = entrantes.get(componente)!.size;
		const ce = salientes.get(componente)!.size;
		const { archivos: n, abstractos, concretos } = conteo.get(componente)!;
		const inestabilidad = ca + ce === 0 ? 0 : ce / (ca + ce);
		const abstraccion = abstractos + concretos === 0 ? 0 : abstractos / (abstractos + concretos);
		const distancia = Math.abs(abstraccion + inestabilidad - 1);
		return {
			componente,
			archivos: n,
			ca,
			ce,
			inestabilidad: redondear(inestabilidad),
			abstractos,
			concretos,
			abstraccion: redondear(abstraccion),
			distancia: redondear(distancia),
			zona: zonaDe(abstraccion, inestabilidad, distancia),
			dependeDe: [...salientes.get(componente)!].sort(),
			usadoPor: [...entrantes.get(componente)!].sort(),
			paquetesExternos: externos.get(componente)!.size,
		};
	});
}

/** CC de todas las funciones y métodos que cubren los patrones. */
async function medirCC(patrones: string[]): Promise<MedicionCC[]> {
	const eslint = new ESLint({
		cwd: RAIZ_REPO,
		useEslintrc: false,
		errorOnUnmatchedPattern: false,
		overrideConfig: {
			ignorePatterns: ['**/*.spec.ts', '**/node_modules/**', '**/dist/**'],
			parser: require.resolve('@typescript-eslint/parser'),
			parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
			rules: { complexity: ['error', { max: 0 }] },
		},
	});
	const resultados = await eslint.lintFiles(patrones);
	return resultados.flatMap((r) =>
		r.messages
			.filter((m) => m.ruleId === 'complexity')
			.map((m) => ({
				archivo: path.relative(RAIZ_REPO, r.filePath).split(path.sep).join('/'),
				linea: m.line,
				funcion: /'([^']+)'/.exec(m.message)?.[1] ?? '(anónima)',
				cc: Number(/complexity of (\d+)/.exec(m.message)?.[1] ?? 0),
			})),
	);
}

function resumir(alcance: string, mediciones: MedicionCC[], umbral: number): ResumenCC {
	const valores = mediciones.map((m) => m.cc).sort((a, b) => a - b);
	const percentil = (p: number) => valores[Math.min(valores.length - 1, Math.ceil((p / 100) * valores.length) - 1)] ?? 0;
	return {
		alcance,
		funciones: valores.length,
		media: redondear(valores.reduce((s, v) => s + v, 0) / (valores.length || 1)),
		mediana: percentil(50),
		p90: percentil(90),
		maxima: valores[valores.length - 1] ?? 0,
		sobreUmbral: valores.filter((v) => v > umbral).length,
		umbral,
		top: [...mediciones].sort((a, b) => b.cc - a.cc).slice(0, 5),
	};
}

function aMarkdown(componentes: MetricaComponente[], cc: ResumenCC[]): string {
	const filasCC = cc.map((r) => `| ${r.alcance} | ${r.funciones} | ${r.media} | ${r.mediana} | ${r.p90} | ${r.maxima} | ${r.umbral} | ${r.sobreUmbral} |`);
	const top = cc.flatMap((r) => r.top.map((t) => `| ${r.alcance} | \`${t.archivo}:${t.linea}\` | ${t.funcion} | ${t.cc} |`));
	const filas = componentes.map((c) =>
		`| \`${c.componente}\` | ${c.archivos} | ${c.ca} | ${c.ce} | ${c.inestabilidad.toFixed(2)} | ${c.abstractos}/${c.abstractos + c.concretos} | ${c.abstraccion.toFixed(2)} | ${c.distancia.toFixed(2)} | ${c.zona} |`,
	);
	const porZona = (z: MetricaComponente['zona']) => componentes.filter((c) => c.zona === z).length;
	const dMedia = redondear(componentes.reduce((s, c) => s + c.distancia, 0) / (componentes.length || 1));
	return [
		'# Métricas estructurales del backend',
		'',
		`Generado por \`tests/architecture/metricas.ts\` (\`npm run metricas\`) el ${new Date().toISOString().slice(0, 10)}.`,
		'',
		`Resumen: ${componentes.length} componentes · D media ${dMedia} · ${porZona('secuencia principal')} cerca de la secuencia principal (D ≤ ${UMBRAL_DISTANCIA}) · ${porZona('zona de dolor')} en la zona de dolor · ${porZona('zona de inutilidad')} en la zona de inutilidad.`,
		'',
		'## Complejidad ciclomática',
		'',
		'| Alcance | Funciones | Media | Mediana | P90 | Máxima | Umbral | Sobre el umbral |',
		'|---|---:|---:|---:|---:|---:|---:|---:|',
		...filasCC,
		'',
		'| Alcance | Ubicación | Función | CC |',
		'|---|---|---|---:|',
		...top,
		'',
		'## Acoplamiento, inestabilidad, abstracción y distancia',
		'',
		'| Componente | Archivos | Ca | Ce | I | Na/(Na+Nc) | A | D | Zona |',
		'|---|---:|---:|---:|---:|---:|---:|---:|---|',
		...filas,
		'',
	].join('\n');
}

async function main(): Promise<void> {
	const componentes = metricasDeComponentes();
	const nucleo = resumir('núcleo y plug-ins (FF-04)', await medirCC(COMPLEJIDAD.evaluadores), COMPLEJIDAD.umbral);
	const backend = resumir('backend completo', await medirCC(['backend/src/**/*.ts', 'backend/plugins/**/*.ts']), COMPLEJIDAD.umbralGeneral);
	const reporte = { generado: new Date().toISOString(), definiciones: { umbralDistancia: UMBRAL_DISTANCIA }, complejidad: [nucleo, backend], componentes };
	const markdown = aMarkdown(componentes, [nucleo, backend]);
	fs.mkdirSync(SALIDA, { recursive: true });
	fs.writeFileSync(path.join(SALIDA, 'metricas-arquitectura.json'), JSON.stringify(reporte, null, 2) + '\n');
	fs.writeFileSync(path.join(SALIDA, 'metricas-arquitectura.md'), markdown);
	if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
	console.log(markdown);
}

if (require.main === module) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
