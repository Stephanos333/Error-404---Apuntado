/**
 * Utilidades de prueba del agregado Partida (solo se importan desde archivos *.spec.ts / e2e).
 */
import { Barajador } from '../../src/dominio/partida/cartas-partida';
import { CartaPartida, PaloCarta, ParametrosPartida, ValorCarta } from '../../src/dominio/partida/partida';

/** Atajo para construir una carta de la baraja 1. */
export const carta = (valor: ValorCarta, palo: PaloCarta, baraja = 1): CartaPartida => ({ valor, palo, baraja });

const esCarta = (x: unknown): x is CartaPartida => typeof x === 'object' && x !== null && 'valor' in x && 'palo' in x;

/**
 * Barajador determinista: pone primero las cartas indicadas (en ese orden) y deja el resto
 * del mazo en su orden natural. Los arreglos que no son de cartas no se reordenan.
 * @param {CartaPartida[]} primeras Las cartas que deben salir primero.
 * @returns {Barajador} El barajador.
 */
export function barajadorConPrimeras(primeras: CartaPartida[]): Barajador {
	return {
		barajar<T>(elementos: ReadonlyArray<T>): T[] {
			if (!elementos.every(esCarta)) return [...elementos];
			const resto = [...(elementos as unknown as CartaPartida[])];
			const inicio = primeras.map((p) => {
				const i = resto.findIndex((c) => c.valor === p.valor && c.palo === p.palo && c.baraja === p.baraja);
				return resto.splice(i, 1)[0];
			});
			return [...inicio, ...resto] as unknown as T[];
		},
	};
}

/**
 * 11 cartas que cierran 4-3-3: cuarta de CINCO (índices 0-3), escalera AS-DOS-TRES de
 * PICAS (4-6), terna de K (7-9) y un NUEVE de CORAZONES para descartar (10).
 */
export const MANO_GANADORA: CartaPartida[] = [
	carta('CINCO', 'TREBOLES'),
	carta('CINCO', 'DIAMANTES'),
	carta('CINCO', 'CORAZONES'),
	carta('CINCO', 'PICAS'),
	carta('AS', 'PICAS'),
	carta('DOS', 'PICAS'),
	carta('TRES', 'PICAS'),
	carta('K', 'TREBOLES'),
	carta('K', 'CORAZONES'),
	carta('K', 'PICAS'),
	carta('NUEVE', 'CORAZONES'),
];

/** Grupos e índice de descarte que cierran con `MANO_GANADORA`. */
export const CIERRE_GANADOR = { grupos: [[0, 1, 2, 3], [4, 5, 6], [7, 8, 9]], descarte: 10 };

/** Parámetros del sistema usados en las pruebas. */
export const PARAMETROS_PRUEBA: ParametrosPartida = {
	limiteEliminacion: 101,
	umbralTocar: 5,
	castigoCierreInvalido: 3,
	bonificacionCierre: -10,
	umbralVictoriaNegativa: -51,
	valorComodin: 0,
	comodinesPorBaraja: 0,
	jugadoresDobleBaraja: 4,
	graciaDesconexionSeg: 120,
	ventanaResultadosSeg: 20,
};
