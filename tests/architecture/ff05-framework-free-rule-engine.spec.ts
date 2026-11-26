/**
 * FF-05 · The rule engine is independent of the framework and the infrastructure
 * (ADR-01 compliance 2, ADR-03, NFR-03 Testability).
 *
 * The rule engine files (prototype: `card/`; target: `rules/` and the plug-ins) cannot
 * import NestJS, Mongoose, Socket.IO or RxJS: that way they are tested in isolation,
 * without starting the application or the database.
 */
import * as path from 'path';
import { BACKEND, BACKEND_SRC, RULE_ENGINE } from './architecture.config';
import { analyzeProject } from './support/dependency-graph';
import { filterNew, readBaseline } from './support/violations';

function forbiddenImports(): string[] {
	const inSrc = analyzeProject(BACKEND_SRC).filter((f) => RULE_ENGINE.folders.includes(f.path.split('/')[0]));
	const inPlugins = analyzeProject(path.join(BACKEND, 'plugins')).map((f) => ({ ...f, path: `plugins/${f.path}` }));
	return [...inSrc, ...inPlugins].flatMap((file) =>
		file.external
			.filter((pkg) => RULE_ENGINE.forbiddenPackages.some((pattern) => pattern.test(pkg)))
			.map((pkg) => `${file.path} -> ${pkg}`),
	);
}

describe('FF-05 The rule engine does not depend on the framework', () => {
	it('no new NestJS/Mongoose/Socket.IO/RxJS imports appear in the rule engine', () => {
		const fresh = filterNew(forbiddenImports(), readBaseline().engineWithFramework, 'FF-05');
		expect(fresh).toEqual([]);
	});
});
