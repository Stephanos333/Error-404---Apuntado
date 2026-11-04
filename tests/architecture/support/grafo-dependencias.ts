/**
 * Utilidades para construir el grafo de dependencias del código fuente a partir
 * de los `import` de TypeScript (sin compilar ni ejecutar la aplicación).
 *
 * Se usa en las fitness functions que TSArch no cubre de forma nativa:
 *  - ciclos entre módulos (carpetas de primer nivel), no solo entre archivos;
 *  - dependencias hacia paquetes externos (p. ej. `@nestjs/*`, `mongoose`).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface ArchivoFuente {
	/** Ruta relativa a la raíz analizada, con separador `/` (p. ej. `player/player.service.ts`). */
	ruta: string;
	/** Imports relativos resueltos a otros archivos del proyecto (rutas relativas a la raíz). */
	internos: string[];
	/** Imports a paquetes externos (p. ej. `@nestjs/common`, `mongoose`). */
	externos: string[];
}

const EXTENSIONES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

function listarArchivos(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const completo = path.join(dir, e.name);
		if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'dist' ? [] : listarArchivos(completo);
		return /\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name) && !/\.spec\.tsx?$/.test(e.name) ? [completo] : [];
	});
}

function resolverRelativo(desde: string, especificador: string): string | undefined {
	const base = path.resolve(path.dirname(desde), especificador);
	if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
	for (const ext of EXTENSIONES) if (fs.existsSync(base + ext)) return base + ext;
	return undefined;
}

/**
 * Analiza todos los archivos `.ts` bajo `raiz` y devuelve sus dependencias.
 * Los imports con alias `src/...` (usados en el prototipo) se resuelven contra `raizAlias`.
 */
export function analizarProyecto(raiz: string, raizAlias = path.dirname(raiz)): ArchivoFuente[] {
	const norm = (p: string) => path.relative(raiz, p).split(path.sep).join('/');
	return listarArchivos(raiz).map((archivo) => {
		const info = ts.preProcessFile(fs.readFileSync(archivo, 'utf8'), true, true);
		const internos: string[] = [];
		const externos: string[] = [];
		for (const { fileName: espec } of info.importedFiles) {
			if (espec.startsWith('.')) {
				const r = resolverRelativo(archivo, espec);
				if (r) internos.push(norm(r));
			} else if (espec.startsWith('src/')) {
				const r = resolverRelativo(path.join(raizAlias, 'x.ts'), './' + espec);
				if (r) internos.push(norm(r));
			} else {
				externos.push(espec);
			}
		}
		return { ruta: norm(archivo), internos, externos };
	});
}

/** Módulo de un archivo = carpeta de primer nivel bajo la raíz (o `(raiz)` si está suelto). */
export function moduloDe(ruta: string): string {
	return ruta.includes('/') ? ruta.split('/')[0] : '(raiz)';
}

/** Grafo dirigido módulo -> módulos de los que depende (sin auto-referencias). */
export function grafoDeModulos(archivos: ArchivoFuente[]): Map<string, Set<string>> {
	const g = new Map<string, Set<string>>();
	for (const a of archivos) {
		const origen = moduloDe(a.ruta);
		if (!g.has(origen)) g.set(origen, new Set());
		for (const d of a.internos) {
			const destino = moduloDe(d);
			if (destino !== origen) g.get(origen)!.add(destino);
		}
	}
	return g;
}

/** Grafo dirigido archivo -> archivos que importa (sin auto-referencias). */
export function grafoDeArchivos(archivos: ArchivoFuente[]): Map<string, Set<string>> {
	return new Map(archivos.map((a) => [a.ruta, new Set(a.internos.filter((d) => d !== a.ruta))]));
}

/**
 * Componentes fuertemente conexos (algoritmo de Tarjan). Cada componente con más de
 * un nodo es un ciclo de dependencias entre módulos.
 */
export function ciclosEnGrafo(g: Map<string, Set<string>>): string[][] {
	let indice = 0;
	const pila: string[] = [];
	const enPila = new Set<string>();
	const idx = new Map<string, number>();
	const low = new Map<string, number>();
	const resultado: string[][] = [];
	const visitar = (v: string) => {
		idx.set(v, indice);
		low.set(v, indice);
		indice++;
		pila.push(v);
		enPila.add(v);
		for (const w of g.get(v) ?? []) {
			if (!idx.has(w)) {
				visitar(w);
				low.set(v, Math.min(low.get(v)!, low.get(w)!));
			} else if (enPila.has(w)) {
				low.set(v, Math.min(low.get(v)!, idx.get(w)!));
			}
		}
		if (low.get(v) === idx.get(v)) {
			const comp: string[] = [];
			let w: string;
			do {
				w = pila.pop()!;
				enPila.delete(w);
				comp.push(w);
			} while (w !== v);
			if (comp.length > 1) resultado.push(comp.sort());
		}
	};
	for (const v of [...g.keys()].sort()) if (!idx.has(v)) visitar(v);
	return resultado;
}

/** Alias semántico para el grafo de módulos. */
export const ciclosEntreModulos = ciclosEnGrafo;

/** Aristas que participan en un ciclo (útil para reportar qué import romper). */
export function aristasDelCiclo(g: Map<string, Set<string>>, ciclo: string[]): string[] {
	const miembros = new Set(ciclo);
	return ciclo.flatMap((o) => [...(g.get(o) ?? [])].filter((d) => miembros.has(d)).map((d) => `${o} -> ${d}`)).sort();
}
