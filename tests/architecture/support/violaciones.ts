/** Utilidades comunes para describir violaciones y aplicar la línea base (trinquete). */
import * as fs from 'fs';
import * as path from 'path';
import { ESTRICTO } from '../arquitectura.config';

export interface LineaBase {
	descripcion: string;
	ciclosEntreArchivos: string[];
	ciclosEntreModulos: string[];
	motorConFramework: string[];
	complejidad: string[];
}

export const RUTA_LINEA_BASE = path.join(__dirname, '..', 'linea-base.json');

export function leerLineaBase(): LineaBase {
	return JSON.parse(fs.readFileSync(RUTA_LINEA_BASE, 'utf8')) as LineaBase;
}

/** Convierte una violación de TSArch en un texto legible `origen -> destino`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function describirViolacionTsArch(v: any): string {
	if (v?.dependency) return `${v.dependency.sourceLabel} -> ${v.dependency.targetLabel}`;
	if (v?.cycle) return `ciclo: ${v.cycle.map((e: { sourceLabel: string }) => e.sourceLabel).join(' -> ')}`;
	if (v?.fileName) return `${v.fileName}`;
	return JSON.stringify(v);
}

/**
 * Aplica el patrón trinquete (ratchet): devuelve solo las violaciones que NO están en la
 * línea base. En modo estricto (`ARQ_ESTRICTO=1`) todas las violaciones cuentan.
 * Además informa qué deudas de la línea base ya se corrigieron y pueden retirarse.
 */
export function filtrarNuevas(actuales: string[], conocidas: string[], etiqueta: string): string[] {
	if (ESTRICTO) return actuales;
	const corregidas = conocidas.filter((c) => !actuales.includes(c));
	if (corregidas.length > 0) {
		console.info(`[${etiqueta}] ${corregidas.length} violación(es) de la línea base ya no existen; retírelas de linea-base.json:\n  ${corregidas.join('\n  ')}`);
	}
	const toleradas = actuales.filter((a) => conocidas.includes(a));
	if (toleradas.length > 0) {
		console.info(`[${etiqueta}] ${toleradas.length} violación(es) toleradas por la línea base (deuda del prototipo).`);
	}
	return actuales.filter((a) => !conocidas.includes(a));
}

/**
 * Patrón de carpeta para TSArch. Se usa en lugar de `inFolder()` porque este exige una
 * barra antes del nombre (`.*\/carpeta\/.*`) y no reconoce carpetas en la raíz del
 * proyecto (p. ej. `src/` o `plugins/`), lo que haría pasar la regla en vacío.
 */
export function carpeta(nombre: string): string {
	return `(^|/)${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`;
}
