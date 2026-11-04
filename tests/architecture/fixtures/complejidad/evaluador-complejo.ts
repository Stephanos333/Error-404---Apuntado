/** Ejemplo intencional de evaluador con complejidad ciclomática 12 (debe ser marcado). */
interface Carta { valor: number; palo: string; esComodin: boolean }

function contieneVuelta(cartas: Carta[]): boolean {
	return cartas.some((c) => c.valor === 1) && cartas.some((c) => c.valor === 13);
}

export function esCombinacionValida(cartas: Carta[], conVuelta: boolean, comodinesActivos: boolean): boolean {
	if (cartas.length < 3 || cartas.length > 4) return false;
	let comodines = 0;
	let mismoValor = true;
	let mismaPinta = true;
	for (const c of cartas) {
		if (c.esComodin) {
			comodines++;
			continue;
		}
		if (c.valor !== cartas[0].valor) mismoValor = false;
		if (c.palo !== cartas[0].palo) mismaPinta = false;
	}
	if (comodines > 1 && comodinesActivos) return false;
	if (mismoValor) return true;
	if (!mismaPinta) return false;
	return conVuelta ? true : !contieneVuelta(cartas);
}
