/**
 * FF-01 · Layer isolation (ADR-01, ADR-04, governance §5.1 rule 1).
 *
 * The presentation layer (REST controllers and WebSocket gateways) cannot access the
 * persistence layer directly (Mongoose schemas/models or database drivers): it always goes
 * through the application services / orchestrator.
 */
import 'tsarch/dist/jest';
import * as path from 'path';
import { filesOfProject } from 'tsarch';
import { BACKEND_SRC, BACKEND_TSCONFIG, LAYERS, FIXTURES } from './architecture.config';
import { analyzeProject } from './support/dependency-graph';
import { folder, describeTsArchViolation } from './support/violations';

async function layerViolations(codeRoot: string, tsconfig: string): Promise<string[]> {
	const result: string[] = [];
	for (const presentation of LAYERS.presentation) {
		for (const persistence of LAYERS.persistence) {
			const v = await filesOfProject(tsconfig)
				.matchingPattern(folder(presentation))
				.shouldNot()
				.dependOnFiles()
				.matchingPattern(folder(persistence))
				.check();
			result.push(...v.map(describeTsArchViolation));
		}
	}
	// Dependencies on external data access packages (TSArch only sees project files).
	for (const file of analyzeProject(codeRoot)) {
		if (!LAYERS.presentation.some((layer) => file.path.split('/').includes(layer))) continue;
		for (const pkg of file.external) {
			if (LAYERS.persistencePackages.some((pattern) => pattern.test(pkg))) result.push(`${file.path} -> ${pkg}`);
		}
	}
	return result;
}

describe('FF-01 Layer isolation: the presentation layer does not access persistence', () => {
	it('real backend: controllers and gateways import neither persistence nor mongoose', async () => {
		expect(await layerViolations(BACKEND_SRC, BACKEND_TSCONFIG)).toEqual([]);
	});

	it('meta-test: detects a controller that imports a schema and mongoose', async () => {
		const root = path.join(FIXTURES, 'layers-with-violation');
		expect(await layerViolations(path.join(root, 'src'), path.join(root, 'tsconfig.json'))).toEqual([
			'src/room/api/room.controller.ts -> src/database/match.schema.ts',
			'room/api/room.controller.ts -> mongoose',
		]);
	});
});
