/**
 * Librería compartida `@apuntado/evaluador-manos` (ADR-02, ADR-03).
 *
 * Reemplaza las tablas `AllowedTrips` (260 entradas) y `AllowedQuads` (299 entradas) del
 * prototipo por una validación algorítmica pura. Una combinación es válida si es:
 *  - un grupo de cartas del mismo valor, con a lo sumo 2 copias de una misma carta
 *    (se juega con hasta dos barajas), o
 *  - una escalera: cartas del mismo palo con valores consecutivos. La política de
 *    escalera decide si puede cruzar de la K al A (`CON_VUELTA`, como en el prototipo).
 *
 * Cada función se mantiene por debajo de complejidad ciclomática 10 (FF-04).
 */
import { Carta, PALOS } from '../contrato/regla-juego.plugin';

/**
 * Política de escalera (Strategy, ADR-02).
 * - `CON_VUELTA`: la escalera puede cruzar K -> A -> 2 (Q-K-A, K-A-2, A-2-3...).
 * - `SIN_VUELTA`: el A puede ir antes del 2 o después de la K, pero no cruzar.
 */
export type PoliticaEscalera = 'CON_VUELTA' | 'SIN_VUELTA';

/** Cantidad de valores distintos de la baraja (A..K). */
export const TOTAL_VALORES = 13;

/** Copias máximas de una misma carta (valor y palo) en una combinación: dos barajas. */
export const COPIAS_MAXIMAS_POR_CARTA = 2;

/** Puntos de cada valor (índice = valor). Misma tabla que el prototipo: A, J, Q y K valen 10. */
const PUNTOS_POR_VALOR: readonly number[] = [0, 10, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];

/** Operaciones que los plug-ins usan para evaluar manos. */
export interface IHandEvaluator {
	esCombinacion(grupo: ReadonlyArray<Carta>): boolean;
	esTerna(grupo: ReadonlyArray<Carta>): boolean;
	esCuarta(grupo: ReadonlyArray<Carta>): boolean;
	esCuartaYDosTernas(grupos: ReadonlyArray<ReadonlyArray<Carta>>): boolean;
	sonTresTernas(grupos: ReadonlyArray<ReadonlyArray<Carta>>): boolean;
	puntos(cartas: ReadonlyArray<Carta>): number;
	puntosNoCombinados(grupos: ReadonlyArray<ReadonlyArray<Carta>>, sobrantes: ReadonlyArray<Carta>): number;
}

/** Determina si una carta tiene un valor y un palo válidos. */
export function esCartaValida(carta: Carta): boolean {
	return Number.isInteger(carta.valor) && carta.valor >= 1 && carta.valor <= TOTAL_VALORES && PALOS.includes(carta.palo);
}

/** Puntos de una carta según la tabla del prototipo. */
export function puntosCarta(carta: Carta): number {
	return PUNTOS_POR_VALOR[carta.valor] ?? 0;
}

/** Mayor cantidad de veces que se repite una misma carta (valor y palo) en el grupo. */
function maximoDeCopias(grupo: ReadonlyArray<Carta>): number {
	const conteo = new Map<string, number>();
	for (const carta of grupo) {
		const clave = `${carta.valor}-${carta.palo}`;
		conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
	}
	return Math.max(0, ...conteo.values());
}

/** Grupo de cartas del mismo valor (p. ej. 7-7-7). */
export function esGrupoDeValor(grupo: ReadonlyArray<Carta>): boolean {
	if (grupo.length === 0) return false;
	const valor = grupo[0].valor;
	return grupo.every((c) => c.valor === valor) && maximoDeCopias(grupo) <= COPIAS_MAXIMAS_POR_CARTA;
}

/** Valores ordenados son consecutivos sin saltos. */
function esLineal(valores: ReadonlyArray<number>): boolean {
	return valores.every((v, i) => i === 0 || v - valores[i - 1] === 1);
}

/** Cantidad de saltos (diferencias distintas de 1) entre valores ordenados. */
function saltos(valores: ReadonlyArray<number>): number {
	return valores.filter((v, i) => i > 0 && v - valores[i - 1] !== 1).length;
}

/** Escalera que puede cruzar K -> A: los valores son consecutivos en un círculo de 13. */
function esConsecutivaCircular(valores: ReadonlyArray<number>): boolean {
	const cierraCirculo = valores[0] + TOTAL_VALORES - valores[valores.length - 1] === 1;
	return esLineal(valores) || (saltos(valores) === 1 && cierraCirculo);
}

/** Escalera sin vuelta: el A vale 1 o 14, pero la escalera no cruza de la K al 2. */
function esConsecutivaSinVuelta(valores: ReadonlyArray<number>): boolean {
	const conAsAlto = valores.map((v) => (v === 1 ? TOTAL_VALORES + 1 : v)).sort((a, b) => a - b);
	return esLineal(valores) || esLineal(conAsAlto);
}

/** Escalera: mismo palo, valores distintos y consecutivos según la política. */
export function esEscalera(grupo: ReadonlyArray<Carta>, politica: PoliticaEscalera = 'CON_VUELTA'): boolean {
	if (grupo.length === 0 || !grupo.every((c) => c.palo === grupo[0].palo)) return false;
	const valores = [...new Set(grupo.map((c) => c.valor))].sort((a, b) => a - b);
	if (valores.length !== grupo.length) return false;
	return politica === 'CON_VUELTA' ? esConsecutivaCircular(valores) : esConsecutivaSinVuelta(valores);
}

/**
 * Evaluador de manos configurable con una política de escalera.
 * @implements {IHandEvaluator}
 */
export class EvaluadorManos implements IHandEvaluator {
	/**
	 * @param {PoliticaEscalera} politicaEscalera Si las escaleras pueden cruzar de la K al A.
	 */
	constructor(private readonly politicaEscalera: PoliticaEscalera = 'CON_VUELTA') {}

	/** Grupo de valor o escalera, con cartas válidas. */
	esCombinacion(grupo: ReadonlyArray<Carta>): boolean {
		if (!grupo.every(esCartaValida)) return false;
		return esGrupoDeValor(grupo) || esEscalera(grupo, this.politicaEscalera);
	}

	/** Combinación de exactamente 3 cartas. */
	esTerna(grupo: ReadonlyArray<Carta>): boolean {
		return grupo.length === 3 && this.esCombinacion(grupo);
	}

	/** Combinación de exactamente 4 cartas. */
	esCuarta(grupo: ReadonlyArray<Carta>): boolean {
		return grupo.length === 4 && this.esCombinacion(grupo);
	}

	/** Exactamente 3 grupos: 1 cuarta y 2 ternas válidas, en cualquier orden. */
	esCuartaYDosTernas(grupos: ReadonlyArray<ReadonlyArray<Carta>>): boolean {
		if (grupos.length !== 3) return false;
		const cuartas = grupos.filter((g) => this.esCuarta(g)).length;
		const ternas = grupos.filter((g) => this.esTerna(g)).length;
		return cuartas === 1 && ternas === 2;
	}

	/** Exactamente 3 grupos y todos son ternas válidas. */
	sonTresTernas(grupos: ReadonlyArray<ReadonlyArray<Carta>>): boolean {
		return grupos.length === 3 && grupos.every((g) => this.esTerna(g));
	}

	/** Suma de puntos de las cartas. */
	puntos(cartas: ReadonlyArray<Carta>): number {
		return cartas.reduce((suma, carta) => suma + puntosCarta(carta), 0);
	}

	/** Puntos de los grupos que no son combinaciones válidas más los de las sobrantes. */
	puntosNoCombinados(grupos: ReadonlyArray<ReadonlyArray<Carta>>, sobrantes: ReadonlyArray<Carta>): number {
		const enGruposInvalidos = grupos.filter((g) => !this.esCombinacion(g)).reduce((s, g) => s + this.puntos(g), 0);
		return enGruposInvalidos + this.puntos(sobrantes);
	}
}
