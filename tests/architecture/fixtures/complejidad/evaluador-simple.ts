/** Ejemplo de evaluador atómico (CC baja): una responsabilidad por función. */
interface Carta { valor: number; palo: string }

export function mismoValor(cartas: Carta[]): boolean {
	return cartas.every((c) => c.valor === cartas[0].valor);
}

export function mismaPinta(cartas: Carta[]): boolean {
	return cartas.every((c) => c.palo === cartas[0].palo);
}
