import { Carta, ManoDeclarada, Palo } from '../../src/reglas/contrato/regla-juego.plugin';
import { ReglaClasicaPlugin } from './regla-clasica.plugin';

const c = (valor: number, palo: Palo): Carta => ({ valor, palo });

const MANO: ManoDeclarada = {
	grupos: [
		[c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE'), c(5, 'DIAMOND')],
		[c(1, 'SPADE'), c(2, 'SPADE'), c(3, 'SPADE')],
		[c(13, 'CLUB'), c(13, 'HEART'), c(13, 'SPADE')],
	],
	sobrantes: [],
	descarte: c(9, 'HEART'),
};

describe('ReglaClasicaPlugin', () => {
	const regla = new ReglaClasicaPlugin();

	it('es de una sola ronda', () => {
		expect(regla.descriptor.multironda).toBe(false);
		expect(regla.cierresPermitidos()).toEqual(['GANAR_4_3_3']);
	});

	it('no admite tocar', () => {
		const tocar: ManoDeclarada = { ...MANO, grupos: [MANO.grupos[0].slice(0, 3), MANO.grupos[1], MANO.grupos[2]], sobrantes: [c(2, 'HEART')] };
		expect(regla.validarCierre(tocar, 'TOCAR').esValido).toBe(false);
	});

	it('no admite cartas sobrantes en el 4-3-3', () => {
		expect(regla.validarCierre({ ...MANO, sobrantes: [c(2, 'HEART')] }, 'GANAR_4_3_3').esValido).toBe(false);
	});

	it('no lleva marcador: el cierre no suma puntos y la ronda no penaliza', () => {
		expect(regla.efectoCierre({ esValido: true }).ajustePuntos).toBe(0);
		expect(regla.efectoCierre({ esValido: false }).ajustePuntos).toBe(0);
		expect(regla.liquidarRonda([{ jugadorId: 'p2', grupos: [[c(2, 'CLUB'), c(9, 'HEART'), c(4, 'SPADE')]], sobrantes: [] }]))
			.toEqual({ penalizaciones: { p2: 0 } });
	});

	it('quien cierra gana y la partida termina en esa ronda', () => {
		expect(regla.evaluarDesenlace({ p1: 0, p2: 0, p3: 0 }, 'p1')).toEqual({
			terminada: true,
			ganadorId: 'p1',
			eliminados: ['p2', 'p3'],
		});
	});
});
