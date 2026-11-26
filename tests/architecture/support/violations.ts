/** Common helpers to describe violations and apply the baseline (ratchet). */
import * as fs from 'fs';
import * as path from 'path';
import { STRICT } from '../architecture.config';

export interface Baseline {
	description: string;
	fileCycles: string[];
	moduleCycles: string[];
	engineWithFramework: string[];
	complexity: string[];
}

export const BASELINE_PATH = path.join(__dirname, '..', 'baseline.json');

export function readBaseline(): Baseline {
	return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
}

/** Turns a TSArch violation into a readable `source -> target` text. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function describeTsArchViolation(v: any): string {
	if (v?.dependency) return `${v.dependency.sourceLabel} -> ${v.dependency.targetLabel}`;
	if (v?.cycle) return `cycle: ${v.cycle.map((e: { sourceLabel: string }) => e.sourceLabel).join(' -> ')}`;
	if (v?.fileName) return `${v.fileName}`;
	return JSON.stringify(v);
}

/**
 * Applies the ratchet pattern: returns only the violations that are NOT in the baseline.
 * In strict mode (`ARCH_STRICT=1`) every violation counts.
 * It also reports which baseline debts were already fixed and can be removed.
 */
export function filterNew(current: string[], known: string[], label: string): string[] {
	if (STRICT) return current;
	const fixed = known.filter((k) => !current.includes(k));
	if (fixed.length > 0) {
		console.info(`[${label}] ${fixed.length} baseline violation(s) no longer exist; remove them from baseline.json:\n  ${fixed.join('\n  ')}`);
	}
	const tolerated = current.filter((c) => known.includes(c));
	if (tolerated.length > 0) {
		console.info(`[${label}] ${tolerated.length} violation(s) tolerated by the baseline (prototype debt).`);
	}
	return current.filter((c) => !known.includes(c));
}

/**
 * Folder pattern for TSArch. It is used instead of `inFolder()` because the latter requires
 * a slash before the name (`.*\/folder\/.*`) and does not recognize folders at the project
 * root (e.g. `src/` or `plugins/`), which would make the rule pass vacuously.
 */
export function folder(name: string): string {
	return `(^|/)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`;
}
