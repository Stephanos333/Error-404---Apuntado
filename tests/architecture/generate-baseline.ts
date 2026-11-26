/**
 * Generates `baseline.json` with the known architectural debt of the prototype.
 *
 * Warning! The baseline must only SHRINK. Regenerating it to accept new violations defeats
 * the purpose of the fitness functions; it requires an approved ADR.
 * Usage: npm run baseline
 */
import * as fs from 'fs';
import { ESLint } from 'eslint';
import * as path from 'path';
import { BACKEND_SRC, COMPLEXITY, RULE_ENGINE, REPO_ROOT } from './architecture.config';
import { cycleEdges, analyzeProject, cyclesInGraph, fileGraph, moduleGraph } from './support/dependency-graph';
import { Baseline, BASELINE_PATH } from './support/violations';

async function main(): Promise<void> {
	const files = analyzeProject(BACKEND_SRC);
	const modules = moduleGraph(files);
	const moduleCycles = cyclesInGraph(modules).flatMap((c) => cycleEdges(modules, c));
	const filesGraph = fileGraph(files);
	const fileCycles = cyclesInGraph(filesGraph).flatMap((c) => cycleEdges(filesGraph, c));
	const engine = files
		.filter((f) => RULE_ENGINE.folders.includes(f.path.split('/')[0]))
		.flatMap((f) => f.external.filter((p) => RULE_ENGINE.forbiddenPackages.some((r) => r.test(p))).map((p) => `${f.path} -> ${p}`));
	const eslint = new ESLint({
		cwd: REPO_ROOT,
		useEslintrc: false,
		errorOnUnmatchedPattern: false,
		overrideConfig: {
			parser: require.resolve('@typescript-eslint/parser'),
			rules: { complexity: ['error', { max: COMPLEXITY.threshold }] },
		},
	});
	const complexity = (await eslint.lintFiles(COMPLEXITY.evaluators)).flatMap((r) =>
		r.messages.filter((m) => m.ruleId === 'complexity').map((m) => `${path.relative(REPO_ROOT, r.filePath).split(path.sep).join('/')}:${m.line} ${m.message}`),
	);
	const baseline: Baseline = {
		description: `Known architectural debt of the prototype (generated ${new Date().toISOString().slice(0, 10)}). It must only shrink.`,
		fileCycles,
		moduleCycles,
		engineWithFramework: engine,
		complexity,
	};
	fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
	console.log(`Baseline: ${fileCycles.length} cyclic edges between files, ${moduleCycles.length} between modules, ${engine.length} framework imports in the engine, ${complexity.length} methods above CC ${COMPLEXITY.threshold}.`);
}

main();
