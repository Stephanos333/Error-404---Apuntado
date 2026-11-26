/**
 * FF-02 · Independence of the rule plug-ins (ADR-03, governance §5.1 rule 2).
 *
 *  a) A rule plug-in (Classic, Apuntado, ...) does not depend on another plug-in.
 *  b) The core (game, scoring, room) does not know concrete plug-ins: only the contract.
 *  c) A plug-in only depends on itself, the contract and the hand evaluator.
 *  d) There are no cycles inside the plug-in folder.
 *
 * The rule is also checked against two sample projects (fixtures): a compliant one and one
 * with violations (meta-tests that prove the rule detects what it claims to detect). On the
 * real backend it runs automatically when `backend/plugins/` exists (ADR-03 refactoring).
 */
import 'tsarch/dist/jest';
import * as fs from 'fs';
import * as path from 'path';
import { filesOfProject } from 'tsarch';
import { BACKEND, BACKEND_TSCONFIG, FIXTURES, MICROKERNEL } from './architecture.config';
import { analyzeProject } from './support/dependency-graph';
import { folder, describeTsArchViolation } from './support/violations';

const PLUGIN_ALLOWED_DEPENDENCIES = ['src/rules/contract/', 'src/rules/evaluator/'];

async function microkernelViolations(projectRoot: string, tsconfig: string): Promise<string[]> {
	const { plugins, pluginNames, core } = MICROKERNEL;
	const result: string[] = [];

	// a) plug-in -> another plug-in
	for (const source of pluginNames) {
		for (const target of pluginNames.filter((n) => n !== source)) {
			const v = await filesOfProject(tsconfig)
				.matchingPattern(folder(`${plugins}/${source}`))
				.shouldNot()
				.dependOnFiles()
				.matchingPattern(folder(`${plugins}/${target}`))
				.check();
			result.push(...v.map((x) => `plugin->plugin: ${describeTsArchViolation(x)}`));
		}
	}
	// b) core -> concrete plug-in
	for (const module of core) {
		const v = await filesOfProject(tsconfig).matchingPattern(folder(module)).shouldNot().dependOnFiles().matchingPattern(folder(plugins)).check();
		result.push(...v.map((x) => `core->plugin: ${describeTsArchViolation(x)}`));
	}
	// c) a plug-in only depends on itself, the contract and the evaluator
	for (const file of analyzeProject(projectRoot).filter((f) => f.path.startsWith(`${plugins}/`))) {
		const own = file.path.split('/').slice(0, 2).join('/') + '/';
		for (const dep of file.internal) {
			if (!dep.startsWith(own) && !PLUGIN_ALLOWED_DEPENDENCIES.some((p) => dep.startsWith(p))) {
				result.push(`plugin->not allowed: ${file.path} -> ${dep}`);
			}
		}
	}
	// d) no cycles between plug-in files
	const cycles = await filesOfProject(tsconfig).matchingPattern(folder(plugins)).should().beFreeOfCycles().check();
	result.push(...cycles.map((x) => `cycle: ${describeTsArchViolation(x)}`));
	return result;
}

describe('FF-02 Independence of the rule plug-ins (microkernel)', () => {
	it('meta-test: a project that complies with ADR-03 has no violations', async () => {
		const root = path.join(FIXTURES, 'microkernel-compliant');
		expect(await microkernelViolations(root, path.join(root, 'tsconfig.json'))).toEqual([]);
	});

	it('meta-test: detects a plug-in that imports another plug-in and a core that imports a plug-in', async () => {
		const root = path.join(FIXTURES, 'microkernel-with-violations');
		const violations = await microkernelViolations(root, path.join(root, 'tsconfig.json'));
		expect(violations).toEqual(
			expect.arrayContaining([
				'plugin->plugin: plugins/apuntado/apuntado-rule.ts -> plugins/classic/classic-rule.ts',
				'core->plugin: src/game/turn-orchestrator.ts -> plugins/classic/classic-rule.ts',
				'plugin->not allowed: plugins/apuntado/apuntado-rule.ts -> plugins/classic/classic-rule.ts',
			]),
		);
	});

	const hasPlugins = fs.existsSync(path.join(BACKEND, MICROKERNEL.plugins));
	(hasPlugins ? it : it.skip)('real backend: the plug-ins are independent and the core only knows the contract', async () => {
		expect(await microkernelViolations(BACKEND, BACKEND_TSCONFIG)).toEqual([]);
	});
});
