/**
 * Map between the documented architecture (Deliverables 1 and 2) and the code folders.
 *
 * Every fitness function reads this file: when the team refactors the prototype towards
 * the target structure (ADR-01 and ADR-03) only these paths change.
 * The paths are relative to `backend/` (where its tsconfig.json lives).
 */
import * as path from 'path';

export const REPO_ROOT = path.resolve(__dirname, '../..');
export const BACKEND = path.join(REPO_ROOT, 'backend');
export const BACKEND_SRC = path.join(BACKEND, 'src');
/** Analysis tsconfig for TSArch (see the comment in the file): it only includes backend/src and backend/plugins. */
export const BACKEND_TSCONFIG = path.join(__dirname, 'tsconfig.backend.json');
export const FIXTURES = path.join(__dirname, 'fixtures');

/** FF-01. Layers: presentation (REST controllers and WebSocket gateways) vs. persistence. */
export const LAYERS = {
	/** Prototype: `<module>/controller/` and `<module>/socket/`. Target (ADR-01): `<domain>/api/`. */
	presentation: ['controller', 'socket', 'api'],
	/** Prototype: `database/` (Mongoose schemas). Target: `<domain>/infrastructure/persistence/`. */
	persistence: ['database', 'persistence'],
	/** Data access packages that the presentation layer cannot import directly. */
	persistencePackages: [/^mongoose$/, /^@nestjs\/mongoose$/, /^mongodb$/],
};

/** FF-02. Rule microkernel (ADR-03): core, contract and plug-ins. */
export const MICROKERNEL = {
	/** Plug-in folder (packages compiled separately, ADR-03). */
	plugins: 'plugins',
	/** Names of the plug-ins that cannot depend on each other. */
	pluginNames: ['classic', 'apuntado'],
	/**
	 * Core folders that may only know the contract, never a concrete plug-in.
	 * `game`, `scoring` and `room` are the names of the D2 design (the fixtures use them);
	 * the others are the real backend folders since D3. The only allowed exception is the
	 * composition root `src/rule-plugins.module.ts`, which is in none of them.
	 */
	core: ['game', 'scoring', 'room', 'domain', 'application', 'rules', 'match', 'match-play'],
};

/** FF-03. First-level modules considered when looking for cycles (all of `src/`). */
export const MODULES_ROOT = BACKEND_SRC;

/** FF-04. Cyclomatic complexity of the card combination evaluators. */
export const COMPLEXITY = {
	threshold: 10,
	/**
	 * D3: the algorithmic evaluator lives in `rules/evaluator/` and the plug-ins in `plugins/`.
	 * Since phase 2 the close and the settlement are computed in the `domain/match/` aggregate
	 * and orchestrated by `application/match/` (TurnOrchestrator, ADR-05).
	 */
	evaluators: [
		'backend/src/card/**/*.ts',
		'backend/src/application/player/player.service.ts',
		'backend/src/application/match/**/*.ts',
		'backend/src/domain/match/**/*.ts',
		'backend/src/rules/**/*.ts',
		'backend/plugins/**/*.ts',
	],
	/** General (informative) threshold for the rest of the backend. */
	generalThreshold: 15,
};

/** FF-05. The rule engine cannot depend on the framework or the infrastructure (ADR-01/ADR-03). */
export const RULE_ENGINE = {
	/** Prototype: `card/`. Target: `rules/`. */
	folders: ['card', 'rules'],
	forbiddenPackages: [/^@nestjs\//, /^mongoose$/, /^socket\.io/, /^rxjs$/],
};

/**
 * Execution mode:
 *  - by default, "ratchet": only the violations recorded in `baseline.json` (known debt of
 *    the prototype) are tolerated; any NEW violation fails.
 *  - `ARCH_STRICT=1`: the baseline is ignored; it is the goal of the refactoring.
 */
export const STRICT = process.env.ARCH_STRICT === '1';
