/** Meta-prueba del patrón trinquete (ratchet) usado por FF-03, FF-04 y FF-05. */
import { filtrarNuevas } from './violaciones';

describe('Trinquete de la línea base', () => {
	it('tolera la deuda conocida y rechaza cualquier violación nueva', () => {
		const conocidas = ['game -> player', 'player -> game'];
		const actuales = ['game -> player', 'player -> game', 'puntaje -> juego'];
		const nuevas = process.env.ARQ_ESTRICTO === '1' ? actuales : ['puntaje -> juego'];
		expect(filtrarNuevas(actuales, conocidas, 'meta')).toEqual(nuevas);
	});
});
