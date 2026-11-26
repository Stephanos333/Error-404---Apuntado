/**
 * FF-03 · No dependency cycles (ADR-01, governance §5.1 rule 2).
 *
 *  a) Between backend files.
 *  b) Between first-level modules `src/<module>`.
 *
 * Both are computed with strongly connected components (Tarjan, O(V+E)) on the import
 * graph. Note: TSArch's `beFreeOfCycles()` enumerates ALL elementary cycles (Johnson's
 * algorithm) and overflows the stack on the prototype graph; that is why the own detector
 * is used here and TSArch is kept for small folders (FF-02).
 *
 * The prototype had cycles (debt recorded in baseline.json). In ratchet mode the test fails
 * if a NEW cyclic edge appears; in strict mode (ARCH_STRICT=1) it fails while any cycle exists.
 */
import { BACKEND_SRC, MODULES_ROOT } from './architecture.config';
import { cycleEdges, analyzeProject, cyclesInGraph, fileGraph, moduleGraph } from './support/dependency-graph';
import { filterNew, readBaseline } from './support/violations';

describe('FF-03 No dependency cycles', () => {
	it('no new cycles appear between backend files', () => {
		const graph = fileGraph(analyzeProject(BACKEND_SRC));
		const edges = cyclesInGraph(graph).flatMap((cycle) => cycleEdges(graph, cycle));
		expect(filterNew(edges, readBaseline().fileCycles, 'FF-03a')).toEqual([]);
	});

	it('no new cycles appear between first-level modules (src/<module>)', () => {
		const graph = moduleGraph(analyzeProject(MODULES_ROOT));
		const edges = cyclesInGraph(graph).flatMap((cycle) => cycleEdges(graph, cycle));
		expect(filterNew(edges, readBaseline().moduleCycles, 'FF-03b')).toEqual([]);
	});

	it('meta-test: the detector finds a known cycle and does not invent cycles', () => {
		const graph = new Map<string, Set<string>>([
			['game', new Set(['rules', 'scoring'])],
			['scoring', new Set(['game'])],
			['rules', new Set<string>()],
		]);
		expect(cyclesInGraph(graph)).toEqual([['game', 'scoring']]);
		expect(cycleEdges(graph, ['game', 'scoring'])).toEqual(['game -> scoring', 'scoring -> game']);
		expect(cyclesInGraph(new Map([['a', new Set(['b'])], ['b', new Set<string>()]]))).toEqual([]);
	});
});
