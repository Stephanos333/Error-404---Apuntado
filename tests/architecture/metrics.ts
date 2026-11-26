/**
 * Structural metrics of the backend (Richards & Ford, 2025, ch. 3; Martin, 1994).
 *
 * Computes, without compiling or running the backend:
 *  - Cyclomatic complexity (CC) of every function and method, with ESLint's `complexity`
 *    rule (the same one FF-04 uses).
 *  - Per component: afferent coupling (Ca), efferent coupling (Ce), instability
 *    I = Ce / (Ca + Ce), abstractness A = Na / (Na + Nc) and distance from the main sequence
 *    D = |A + I - 1|.
 *
 * Operational definitions (documented in docs/capitulo-4-cicd-metricas.md):
 *  - Component: `src/<module>`; in the `application/`, `domain/` and `rules/` layers, the
 *    subcomponent `src/<layer>/<module>`; each plug-in `plugins/<id>`. The loose files of
 *    `src/` form `src/(root)` (main, app.module and the plug-in composition root).
 *  - Ca: distinct components that import some file of the component.
 *    Ce: distinct components the component imports something from (JDepend style).
 *    Only imports between backend files count; npm packages are reported separately.
 *  - Na: interfaces and abstract classes. Nc: concrete classes and module-level functions
 *    (declared or assigned to a constant). `type` aliases and `enum`s do not count.
 *  - Tests (`*.spec.ts`) and `backend/test/` are excluded.
 *
 * The generated report is project documentation, so its text is written in Spanish.
 * Usage: npm run metrics  (writes docs/metricas/metricas-arquitectura.{json,md})
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { ESLint } from 'eslint';
import { BACKEND, COMPLEXITY, REPO_ROOT } from './architecture.config';
import { analyzeProject } from './support/dependency-graph';

const OUTPUT = path.join(REPO_ROOT, 'docs', 'metricas');
const LAYERS_WITH_SUBCOMPONENTS = ['application', 'domain', 'rules'];
/** Guiding threshold of D to flag a component far from the main sequence. */
const DISTANCE_THRESHOLD = 0.5;

type Zone = 'main-sequence' | 'zone-of-pain' | 'zone-of-uselessness';
const ZONE_LABELS: Record<Zone, string> = {
	'main-sequence': 'secuencia principal',
	'zone-of-pain': 'zona de dolor',
	'zone-of-uselessness': 'zona de inutilidad',
};

interface ComponentMetric {
	component: string;
	files: number;
	ca: number;
	ce: number;
	instability: number;
	abstractElements: number;
	concreteElements: number;
	abstractness: number;
	distance: number;
	zone: Zone;
	dependsOn: string[];
	usedBy: string[];
	externalPackages: number;
}

interface CCMeasurement {
	file: string;
	line: number;
	function: string;
	cc: number;
}

interface CCSummary {
	scope: string;
	functions: number;
	mean: number;
	median: number;
	p90: number;
	max: number;
	aboveThreshold: number;
	threshold: number;
	top: CCMeasurement[];
}

const round = (n: number, d = 2): number => Math.round(n * 10 ** d) / 10 ** d;

/** Component a file belongs to (path relative to backend/). */
export function componentOf(filePath: string): string {
	const p = filePath.split('/');
	if (p[0] === 'plugins') return p.length > 2 ? `plugins/${p[1]}` : 'plugins/(root)';
	if (p.length === 2) return 'src/(root)';
	if (LAYERS_WITH_SUBCOMPONENTS.includes(p[1]) && p.length > 3) return `src/${p[1]}/${p[2]}`;
	return `src/${p[1]}`;
}

/** Counts the abstract and concrete elements declared at module level in a file. */
function countElements(file: string): { abstractElements: number; concreteElements: number } {
	const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true);
	let abstractElements = 0;
	let concreteElements = 0;
	const isFunction = (e?: ts.Expression) => !!e && (ts.isArrowFunction(e) || ts.isFunctionExpression(e));
	for (const statement of source.statements) {
		if (ts.isInterfaceDeclaration(statement)) abstractElements++;
		else if (ts.isClassDeclaration(statement)) {
			const isAbstract = ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword);
			if (isAbstract) abstractElements++;
			else concreteElements++;
		} else if (ts.isFunctionDeclaration(statement)) concreteElements++;
		else if (ts.isVariableStatement(statement)) {
			concreteElements += statement.declarationList.declarations.filter((d) => isFunction(d.initializer)).length;
		}
	}
	return { abstractElements, concreteElements };
}

function zoneOf(a: number, i: number, d: number): Zone {
	if (d <= DISTANCE_THRESHOLD) return 'main-sequence';
	return a + i < 1 ? 'zone-of-pain' : 'zone-of-uselessness';
}

/** Ca, Ce, I, A and D per component. */
export function componentMetrics(): ComponentMetric[] {
	const files = analyzeProject(BACKEND, BACKEND).filter((f) => f.path.startsWith('src/') || f.path.startsWith('plugins/'));
	const outgoing = new Map<string, Set<string>>();
	const incoming = new Map<string, Set<string>>();
	const external = new Map<string, Set<string>>();
	const counts = new Map<string, { files: number; abstractElements: number; concreteElements: number }>();
	const ensure = (c: string) => {
		if (!outgoing.has(c)) {
			outgoing.set(c, new Set());
			incoming.set(c, new Set());
			external.set(c, new Set());
			counts.set(c, { files: 0, abstractElements: 0, concreteElements: 0 });
		}
	};
	for (const f of files) {
		const source = componentOf(f.path);
		ensure(source);
		const elements = countElements(path.join(BACKEND, f.path));
		const c = counts.get(source)!;
		c.files++;
		c.abstractElements += elements.abstractElements;
		c.concreteElements += elements.concreteElements;
		f.external.forEach((p) => external.get(source)!.add(p));
		for (const targetPath of f.internal) {
			const target = componentOf(targetPath);
			if (target === source) continue;
			ensure(target);
			outgoing.get(source)!.add(target);
			incoming.get(target)!.add(source);
		}
	}
	return [...counts.keys()].sort().map((component) => {
		const ca = incoming.get(component)!.size;
		const ce = outgoing.get(component)!.size;
		const { files: n, abstractElements, concreteElements } = counts.get(component)!;
		const instability = ca + ce === 0 ? 0 : ce / (ca + ce);
		const abstractness = abstractElements + concreteElements === 0 ? 0 : abstractElements / (abstractElements + concreteElements);
		const distance = Math.abs(abstractness + instability - 1);
		return {
			component,
			files: n,
			ca,
			ce,
			instability: round(instability),
			abstractElements,
			concreteElements,
			abstractness: round(abstractness),
			distance: round(distance),
			zone: zoneOf(abstractness, instability, distance),
			dependsOn: [...outgoing.get(component)!].sort(),
			usedBy: [...incoming.get(component)!].sort(),
			externalPackages: external.get(component)!.size,
		};
	});
}

/** CC of every function and method covered by the patterns. */
async function measureCC(patterns: string[]): Promise<CCMeasurement[]> {
	const eslint = new ESLint({
		cwd: REPO_ROOT,
		useEslintrc: false,
		errorOnUnmatchedPattern: false,
		overrideConfig: {
			ignorePatterns: ['**/*.spec.ts', '**/node_modules/**', '**/dist/**'],
			parser: require.resolve('@typescript-eslint/parser'),
			parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
			rules: { complexity: ['error', { max: 0 }] },
		},
	});
	const results = await eslint.lintFiles(patterns);
	return results.flatMap((r) =>
		r.messages
			.filter((m) => m.ruleId === 'complexity')
			.map((m) => ({
				file: path.relative(REPO_ROOT, r.filePath).split(path.sep).join('/'),
				line: m.line,
				function: /'([^']+)'/.exec(m.message)?.[1] ?? '(anonymous)',
				cc: Number(/complexity of (\d+)/.exec(m.message)?.[1] ?? 0),
			})),
	);
}

function summarize(scope: string, measurements: CCMeasurement[], threshold: number): CCSummary {
	const values = measurements.map((m) => m.cc).sort((a, b) => a - b);
	const percentile = (p: number) => values[Math.min(values.length - 1, Math.ceil((p / 100) * values.length) - 1)] ?? 0;
	return {
		scope,
		functions: values.length,
		mean: round(values.reduce((s, v) => s + v, 0) / (values.length || 1)),
		median: percentile(50),
		p90: percentile(90),
		max: values[values.length - 1] ?? 0,
		aboveThreshold: values.filter((v) => v > threshold).length,
		threshold,
		top: [...measurements].sort((a, b) => b.cc - a.cc).slice(0, 5),
	};
}

function toMarkdown(components: ComponentMetric[], cc: CCSummary[]): string {
	const ccRows = cc.map((r) => `| ${r.scope} | ${r.functions} | ${r.mean} | ${r.median} | ${r.p90} | ${r.max} | ${r.threshold} | ${r.aboveThreshold} |`);
	const top = cc.flatMap((r) => r.top.map((t) => `| ${r.scope} | \`${t.file}:${t.line}\` | ${t.function} | ${t.cc} |`));
	const rows = components.map((c) =>
		`| \`${c.component}\` | ${c.files} | ${c.ca} | ${c.ce} | ${c.instability.toFixed(2)} | ${c.abstractElements}/${c.abstractElements + c.concreteElements} | ${c.abstractness.toFixed(2)} | ${c.distance.toFixed(2)} | ${ZONE_LABELS[c.zone]} |`,
	);
	const inZone = (z: Zone) => components.filter((c) => c.zone === z).length;
	const meanD = round(components.reduce((s, c) => s + c.distance, 0) / (components.length || 1));
	return [
		'# Métricas estructurales del backend',
		'',
		`Generado por \`tests/architecture/metrics.ts\` (\`npm run metrics\`) el ${new Date().toISOString().slice(0, 10)}.`,
		'',
		`Resumen: ${components.length} componentes · D media ${meanD} · ${inZone('main-sequence')} cerca de la secuencia principal (D ≤ ${DISTANCE_THRESHOLD}) · ${inZone('zone-of-pain')} en la zona de dolor · ${inZone('zone-of-uselessness')} en la zona de inutilidad.`,
		'',
		'## Complejidad ciclomática',
		'',
		'| Alcance | Funciones | Media | Mediana | P90 | Máxima | Umbral | Sobre el umbral |',
		'|---|---:|---:|---:|---:|---:|---:|---:|',
		...ccRows,
		'',
		'| Alcance | Ubicación | Función | CC |',
		'|---|---|---|---:|',
		...top,
		'',
		'## Acoplamiento, inestabilidad, abstracción y distancia',
		'',
		'| Componente | Archivos | Ca | Ce | I | Na/(Na+Nc) | A | D | Zona |',
		'|---|---:|---:|---:|---:|---:|---:|---:|---|',
		...rows,
		'',
	].join('\n');
}

async function main(): Promise<void> {
	const components = componentMetrics();
	const core = summarize('núcleo y plug-ins (FF-04)', await measureCC(COMPLEXITY.evaluators), COMPLEXITY.threshold);
	const backend = summarize('backend completo', await measureCC(['backend/src/**/*.ts', 'backend/plugins/**/*.ts']), COMPLEXITY.generalThreshold);
	const report = { generatedAt: new Date().toISOString(), definitions: { distanceThreshold: DISTANCE_THRESHOLD }, complexity: [core, backend], components };
	const markdown = toMarkdown(components, [core, backend]);
	fs.mkdirSync(OUTPUT, { recursive: true });
	fs.writeFileSync(path.join(OUTPUT, 'metricas-arquitectura.json'), JSON.stringify(report, null, 2) + '\n');
	fs.writeFileSync(path.join(OUTPUT, 'metricas-arquitectura.md'), markdown);
	if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
	console.log(markdown);
}

if (require.main === module) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
