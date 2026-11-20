import { Carta, Palo, PALOS } from '../contrato/regla-juego.plugin';
import { EvaluadorManos, esEscalera, esGrupoDeValor, puntosCarta } from './evaluador-manos';

const c = (valor: number, palo: Palo = 'HEART'): Carta => ({ valor, palo });

/** Todas las combinaciones con repetición de k cartas sobre la baraja de 52. */
function contarValidas(evaluador: EvaluadorManos, k: number): number {
	const mazo: Carta[] = Array.from({ length: 13 }, (_, i) => i + 1).flatMap((valor) => PALOS.map((palo) => c(valor, palo)));
	let validas = 0;
	const recorrer = (desde: number, actual: Carta[]): void => {
		if (actual.length === k) {
			if (evaluador.esCombinacion(actual)) validas++;
			return;
		}
		for (let i = desde; i < mazo.length; i++) recorrer(i, [...actual, mazo[i]]);
	};
	recorrer(0, []);
	return validas;
}

describe('EvaluadorManos', () => {
	const evaluador = new EvaluadorManos();

	describe('oráculo de regresión contra las tablas del prototipo', () => {
		it('acepta exactamente las 260 ternas de AllowedTrips', () => {
			expect(contarValidas(evaluador, 3)).toBe(260);
		});

		it('acepta exactamente las 299 cuartas de AllowedQuads', () => {
			expect(contarValidas(evaluador, 4)).toBe(299);
		});
	});

	describe('grupos del mismo valor', () => {
		it('acepta tres o cuatro cartas del mismo valor', () => {
			expect(esGrupoDeValor([c(7, 'CLUB'), c(7, 'HEART'), c(7, 'SPADE')])).toBe(true);
			expect(evaluador.esCuarta([c(1, 'CLUB'), c(1, 'CLUB'), c(1, 'DIAMOND'), c(1, 'DIAMOND')])).toBe(true);
		});

		it('rechaza tres copias de la misma carta (solo hay dos barajas)', () => {
			expect(evaluador.esTerna([c(7, 'CLUB'), c(7, 'CLUB'), c(7, 'CLUB')])).toBe(false);
		});

		it('rechaza valores distintos de palos distintos', () => {
			expect(evaluador.esTerna([c(7, 'CLUB'), c(8, 'HEART'), c(9, 'SPADE')])).toBe(false);
		});
	});

	describe('escaleras', () => {
		it('acepta valores consecutivos del mismo palo en cualquier orden', () => {
			expect(evaluador.esTerna([c(9), c(8), c(10)])).toBe(true);
			expect(evaluador.esCuarta([c(11), c(10), c(12), c(13)])).toBe(true);
		});

		it('con vuelta (prototipo) acepta Q-K-A, K-A-2 y A-2-3', () => {
			expect(evaluador.esTerna([c(12), c(13), c(1)])).toBe(true);
			expect(evaluador.esTerna([c(13), c(1), c(2)])).toBe(true);
			expect(evaluador.esTerna([c(1), c(2), c(3)])).toBe(true);
			expect(evaluador.esCuarta([c(12), c(13), c(1), c(2)])).toBe(true);
		});

		it('sin vuelta acepta Q-K-A y A-2-3 pero no K-A-2', () => {
			const sinVuelta = new EvaluadorManos('SIN_VUELTA');
			expect(sinVuelta.esTerna([c(12), c(13), c(1)])).toBe(true);
			expect(sinVuelta.esTerna([c(1), c(2), c(3)])).toBe(true);
			expect(sinVuelta.esTerna([c(13), c(1), c(2)])).toBe(false);
		});

		it('rechaza palos mezclados, huecos y cartas repetidas', () => {
			expect(esEscalera([c(4, 'CLUB'), c(5, 'HEART'), c(6, 'CLUB')])).toBe(false);
			expect(esEscalera([c(4), c(5), c(7)])).toBe(false);
			expect(esEscalera([c(4), c(4), c(5)])).toBe(false);
			expect(esEscalera([c(1), c(3), c(13)])).toBe(false);
		});
	});

	describe('cierres y puntos', () => {
		const cuarta = [c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE'), c(5, 'DIAMOND')];
		const terna1 = [c(1, 'SPADE'), c(2, 'SPADE'), c(3, 'SPADE')];
		const terna2 = [c(13, 'CLUB'), c(13, 'HEART'), c(13, 'SPADE')];

		it('reconoce 1 cuarta + 2 ternas en cualquier orden', () => {
			expect(evaluador.esCuartaYDosTernas([terna1, cuarta, terna2])).toBe(true);
			expect(evaluador.esCuartaYDosTernas([terna1, terna2, terna2])).toBe(false);
		});

		it('reconoce 3 ternas', () => {
			expect(evaluador.sonTresTernas([terna1, terna2, cuarta.slice(0, 3)])).toBe(true);
			expect(evaluador.sonTresTernas([terna1, terna2, cuarta])).toBe(false);
		});

		it('usa la tabla de puntos del prototipo (A, J, Q y K valen 10)', () => {
			expect([1, 2, 9, 10, 11, 12, 13].map((v) => puntosCarta(c(v)))).toEqual([10, 2, 9, 10, 10, 10, 10]);
		});

		it('solo penaliza los grupos que no combinan y las sobrantes', () => {
			const invalido = [c(2, 'CLUB'), c(9, 'HEART'), c(4, 'SPADE')];
			expect(evaluador.puntosNoCombinados([terna1, invalido], [c(3)])).toBe(2 + 9 + 4 + 3);
		});

		it('rechaza cartas fuera del rango del contrato', () => {
			expect(evaluador.esTerna([c(0), c(1), c(2)])).toBe(false);
			expect(evaluador.esTerna([c(5, 'X' as Palo), c(5), c(5, 'CLUB')])).toBe(false);
		});
	});
});
