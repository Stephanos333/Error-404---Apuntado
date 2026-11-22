import { randomInt } from 'node:crypto';
import { Carta, Palo } from '../../reglas/contrato/regla-juego.plugin';
import { CartaPartida, PALOS_CARTA, PaloCarta, VALORES_CARTA } from './partida';

/** Palo del esquema documental -> palo del contrato de reglas. */
const PALO_CONTRATO: Record<PaloCarta, Palo> = {
	TREBOLES: 'CLUB',
	DIAMANTES: 'DIAMOND',
	CORAZONES: 'HEART',
	PICAS: 'SPADE',
};

/**
 * Traduce una carta de la partida al contrato de reglas (A = 1 ... K = 13).
 * @param {CartaPartida} carta La carta de la partida.
 * @returns {Carta} La carta en el contrato.
 */
export function aCartaContrato(carta: CartaPartida): Carta {
	return { valor: VALORES_CARTA.indexOf(carta.valor) + 1, palo: PALO_CONTRATO[carta.palo] };
}

/**
 * Crea un mazo ordenado de 52 cartas por baraja.
 * @param {number} barajas Cantidad de barajas (1 o 2).
 * @returns {CartaPartida[]} El mazo sin barajar.
 */
export function crearMazo(barajas: number): CartaPartida[] {
	return Array.from({ length: barajas }, (_, b) => b + 1).flatMap((baraja) =>
		VALORES_CARTA.flatMap((valor) => PALOS_CARTA.map((palo): CartaPartida => ({ valor, palo, baraja }))),
	);
}

/** Estrategia para barajar el mazo (permite pruebas deterministas). */
export interface Barajador {
	barajar<T>(elementos: ReadonlyArray<T>): T[];
}

/** Token de inyección del barajador. */
export const BARAJADOR = 'BARAJADOR';

/**
 * Barajado Fisher-Yates con un generador criptográficamente seguro (ADR-03, R04):
 * el orden del mazo no se puede predecir desde el cliente.
 * @implements {Barajador}
 */
export class BarajadorSeguro implements Barajador {
	barajar<T>(elementos: ReadonlyArray<T>): T[] {
		const copia = [...elementos];
		for (let i = copia.length - 1; i > 0; i--) {
			const j = randomInt(i + 1);
			[copia[i], copia[j]] = [copia[j], copia[i]];
		}
		return copia;
	}
}
