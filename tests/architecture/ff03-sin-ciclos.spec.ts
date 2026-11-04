/**
 * FF-03 · Ausencia de dependencias cíclicas (ADR-01, gobernanza §5.1 regla 2).
 *
 *  a) Entre archivos del backend.
 *  b) Entre módulos de primer nivel `src/<módulo>`.
 *
 * Ambas se calculan con componentes fuertemente conexos (Tarjan, O(V+E)) sobre el grafo de
 * imports. Nota: `beFreeOfCycles()` de TSArch enumera TODOS los ciclos elementales
 * (algoritmo de Johnson) y desborda la pila en el grafo del prototipo; por eso aquí se usa
 * el detector propio y TSArch se reserva para carpetas pequeñas (FF-02).
 *
 * El prototipo tiene ciclos (deuda registrada en linea-base.json). En modo trinquete la
 * prueba falla si aparece una arista cíclica NUEVA; en modo estricto (ARQ_ESTRICTO=1)
 * falla mientras exista cualquier ciclo.
 */
import { BACKEND_SRC, RAIZ_MODULOS } from './arquitectura.config';
import { aristasDelCiclo, analizarProyecto, ciclosEnGrafo, grafoDeArchivos, grafoDeModulos } from './support/grafo-dependencias';
import { filtrarNuevas, leerLineaBase } from './support/violaciones';

describe('FF-03 Ausencia de dependencias cíclicas', () => {
	it('no aparecen ciclos nuevos entre archivos del backend', () => {
		const grafo = grafoDeArchivos(analizarProyecto(BACKEND_SRC));
		const aristas = ciclosEnGrafo(grafo).flatMap((ciclo) => aristasDelCiclo(grafo, ciclo));
		expect(filtrarNuevas(aristas, leerLineaBase().ciclosEntreArchivos, 'FF-03a')).toEqual([]);
	});

	it('no aparecen ciclos nuevos entre módulos de primer nivel (src/<módulo>)', () => {
		const grafo = grafoDeModulos(analizarProyecto(RAIZ_MODULOS));
		const aristas = ciclosEnGrafo(grafo).flatMap((ciclo) => aristasDelCiclo(grafo, ciclo));
		expect(filtrarNuevas(aristas, leerLineaBase().ciclosEntreModulos, 'FF-03b')).toEqual([]);
	});

	it('meta-prueba: el detector encuentra un ciclo conocido y no inventa ciclos', () => {
		const grafo = new Map<string, Set<string>>([
			['juego', new Set(['reglas', 'puntaje'])],
			['puntaje', new Set(['juego'])],
			['reglas', new Set<string>()],
		]);
		expect(ciclosEnGrafo(grafo)).toEqual([['juego', 'puntaje']]);
		expect(aristasDelCiclo(grafo, ['juego', 'puntaje'])).toEqual(['juego -> puntaje', 'puntaje -> juego']);
		expect(ciclosEnGrafo(new Map([['a', new Set(['b'])], ['b', new Set<string>()]]))).toEqual([]);
	});
});
