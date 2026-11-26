/**
 * Helpers that build the dependency graph of the source code from the TypeScript
 * `import`s (without compiling or running the application).
 *
 * Used by the fitness functions that TSArch does not cover natively:
 *  - cycles between modules (first-level folders), not only between files;
 *  - dependencies on external packages (e.g. `@nestjs/*`, `mongoose`).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface SourceFileInfo {
	/** Path relative to the analyzed root, with `/` as separator (e.g. `player/player.service.ts`). */
	path: string;
	/** Relative imports resolved to other project files (paths relative to the root). */
	internal: string[];
	/** Imports of external packages (e.g. `@nestjs/common`, `mongoose`). */
	external: string[];
}

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

function listFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'dist' ? [] : listFiles(full);
		return /\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name) && !/\.spec\.tsx?$/.test(e.name) ? [full] : [];
	});
}

function resolveRelative(from: string, specifier: string): string | undefined {
	const base = path.resolve(path.dirname(from), specifier);
	if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
	for (const ext of EXTENSIONS) if (fs.existsSync(base + ext)) return base + ext;
	return undefined;
}

/**
 * Analyzes every `.ts` file under `root` and returns its dependencies.
 * Imports with the `src/...` alias (used by the prototype) are resolved against `aliasRoot`.
 */
export function analyzeProject(root: string, aliasRoot = path.dirname(root)): SourceFileInfo[] {
	const norm = (p: string) => path.relative(root, p).split(path.sep).join('/');
	return listFiles(root).map((file) => {
		const info = ts.preProcessFile(fs.readFileSync(file, 'utf8'), true, true);
		const internal: string[] = [];
		const external: string[] = [];
		for (const { fileName: specifier } of info.importedFiles) {
			if (specifier.startsWith('.')) {
				const r = resolveRelative(file, specifier);
				if (r) internal.push(norm(r));
			} else if (specifier.startsWith('src/')) {
				const r = resolveRelative(path.join(aliasRoot, 'x.ts'), './' + specifier);
				if (r) internal.push(norm(r));
			} else {
				external.push(specifier);
			}
		}
		return { path: norm(file), internal, external };
	});
}

/** Module of a file = first-level folder under the root (or `(root)` for loose files). */
export function moduleOf(filePath: string): string {
	return filePath.includes('/') ? filePath.split('/')[0] : '(root)';
}

/** Directed graph module -> modules it depends on (no self references). */
export function moduleGraph(files: SourceFileInfo[]): Map<string, Set<string>> {
	const g = new Map<string, Set<string>>();
	for (const f of files) {
		const source = moduleOf(f.path);
		if (!g.has(source)) g.set(source, new Set());
		for (const d of f.internal) {
			const target = moduleOf(d);
			if (target !== source) g.get(source)!.add(target);
		}
	}
	return g;
}

/** Directed graph file -> files it imports (no self references). */
export function fileGraph(files: SourceFileInfo[]): Map<string, Set<string>> {
	return new Map(files.map((f) => [f.path, new Set(f.internal.filter((d) => d !== f.path))]));
}

/**
 * Strongly connected components (Tarjan's algorithm). Every component with more than
 * one node is a dependency cycle.
 */
export function cyclesInGraph(g: Map<string, Set<string>>): string[][] {
	let index = 0;
	const stack: string[] = [];
	const onStack = new Set<string>();
	const idx = new Map<string, number>();
	const low = new Map<string, number>();
	const result: string[][] = [];
	const visit = (v: string) => {
		idx.set(v, index);
		low.set(v, index);
		index++;
		stack.push(v);
		onStack.add(v);
		for (const w of g.get(v) ?? []) {
			if (!idx.has(w)) {
				visit(w);
				low.set(v, Math.min(low.get(v)!, low.get(w)!));
			} else if (onStack.has(w)) {
				low.set(v, Math.min(low.get(v)!, idx.get(w)!));
			}
		}
		if (low.get(v) === idx.get(v)) {
			const component: string[] = [];
			let w: string;
			do {
				w = stack.pop()!;
				onStack.delete(w);
				component.push(w);
			} while (w !== v);
			if (component.length > 1) result.push(component.sort());
		}
	};
	for (const v of [...g.keys()].sort()) if (!idx.has(v)) visit(v);
	return result;
}

/** Semantic alias for the module graph. */
export const moduleCycles = cyclesInGraph;

/** Edges that take part in a cycle (useful to report which import to break). */
export function cycleEdges(g: Map<string, Set<string>>, cycle: string[]): string[] {
	const members = new Set(cycle);
	return cycle.flatMap((o) => [...(g.get(o) ?? [])].filter((d) => members.has(d)).map((d) => `${o} -> ${d}`)).sort();
}
