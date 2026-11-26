/**
 * FF-04 · Cyclomatic complexity limit (governance §5.1 rule 3, §5.3).
 *
 * No card combination evaluator method can exceed CC = 10.
 * ESLint computes the complexity (`complexity` rule): 1 + number of decision points
 * (if, else if, for, while, case, catch, &&, ||, ??, ?:).
 */
import { ESLint } from 'eslint';
import * as path from 'path';
import { COMPLEXITY, FIXTURES, REPO_ROOT } from './architecture.config';
import { filterNew, readBaseline } from './support/violations';

async function methodsAbove(patterns: string[], threshold: number, cwd = REPO_ROOT): Promise<string[]> {
	const eslint = new ESLint({
		cwd,
		useEslintrc: false,
		errorOnUnmatchedPattern: false,
		overrideConfig: {
			parser: require.resolve('@typescript-eslint/parser'),
			parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
			rules: { complexity: ['error', { max: threshold }] },
		},
	});
	const results = await eslint.lintFiles(patterns);
	return results.flatMap((r) =>
		r.messages
			.filter((m) => m.ruleId === 'complexity')
			.map((m) => `${path.relative(cwd, r.filePath).split(path.sep).join('/')}:${m.line} ${m.message}`),
	);
}

describe('FF-04 Cyclomatic complexity', () => {
	it(`no combination evaluator method exceeds CC ${COMPLEXITY.threshold}`, async () => {
		const current = await methodsAbove(COMPLEXITY.evaluators, COMPLEXITY.threshold);
		expect(filterNew(current, readBaseline().complexity, 'FF-04')).toEqual([]);
	});

	it(`informative: no backend method exceeds CC ${COMPLEXITY.generalThreshold}`, async () => {
		expect(await methodsAbove(['backend/src/**/*.ts'], COMPLEXITY.generalThreshold)).toEqual([]);
	});

	it('meta-test: flags an evaluator with CC 12 and accepts one with low CC', async () => {
		const cwd = path.join(FIXTURES, 'complexity');
		const flagged = await methodsAbove(['*.ts'], COMPLEXITY.threshold, cwd);
		expect(flagged).toHaveLength(1);
		expect(flagged[0]).toMatch(/^complex-evaluator\.ts:\d+ .*isValidMeld.* complexity of 12/);
	});
});
