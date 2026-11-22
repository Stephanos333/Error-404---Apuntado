import { Carta, ManoDeclarada, Marcador, Palo, ReglaJuegoPlugin } from '../../src/reglas/contrato/regla-juego.plugin';
import { ReglaApuntadoPlugin } from './regla-apuntado.plugin';

const c = (valor: number, palo: Palo): Carta => ({ valor, palo });

const TERNAS = [
	[c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE')],
	[c(1, 'SPADE'), c(2, 'SPADE'), c(3, 'SPADE')],
	[c(13, 'CLUB'), c(13, 'HEART'), c(13, 'SPADE')],
];

const tocar = (sobrante: Carta): ManoDeclarada => ({ grupos: TERNAS, sobrantes: [sobrante], descarte: c(9, 'HEART') });

describe('ReglaApuntadoPlugin', () => {
	// Se usa a través del contrato, igual que lo hace el núcleo.
	const regla: ReglaJuegoPlugin = new ReglaApuntadoPlugin({ bonificacionCierre: 10, castigoCierreFalso: 3 });

	it('es multironda y admite 4-3-3 y tocar', () => {
		expect(regla.descriptor.multironda).toBe(true);
		expect(regla.cierresPermitidos()).toEqual(['GANAR_4_3_3', 'TOCAR']);
	});

	describe('tocar: 3 ternas + 1 sobrante de menos de 5 puntos', () => {
		it('acepta una sobrante de 4 puntos', () => {
			expect(regla.validarCierre(tocar(c(4, 'DIAMOND')), 'TOCAR').esValido).toBe(true);
		});

		it('rechaza una sobrante de 5 puntos o más', () => {
			expect(regla.validarCierre(tocar(c(5, 'DIAMOND')), 'TOCAR').esValido).toBe(false);
			expect(regla.validarCierre(tocar(c(1, 'DIAMOND')), 'TOCAR').esValido).toBe(false);
		});

		it('rechaza si alguna terna no combina o si sobra más de una carta', () => {
			const rota: ManoDeclarada = { ...tocar(c(2, 'DIAMOND')), grupos: [TERNAS[0], TERNAS[1], [c(13, 'CLUB'), c(12, 'HEART'), c(2, 'SPADE')]] };
			expect(regla.validarCierre(rota, 'TOCAR').esValido).toBe(false);
			expect(regla.validarCierre({ ...tocar(c(2, 'DIAMOND')), sobrantes: [c(2, 'DIAMOND'), c(3, 'DIAMOND')] }, 'TOCAR').esValido).toBe(false);
		});

		it('un toque válido da ronda extra a los demás sin terminar la ronda', () => {
			expect(regla.efectoCierre({ esValido: true }, 'TOCAR')).toEqual({ terminaRonda: false, rondaExtra: true, ajustePuntos: 0 });
		});

		it('respeta el umbral configurado', () => {
			const estricta = new ReglaApuntadoPlugin({ umbralTocar: 3 });
			expect(estricta.validarCierre(tocar(c(3, 'DIAMOND')), 'TOCAR').esValido).toBe(false);
			expect(estricta.validarCierre(tocar(c(2, 'DIAMOND')), 'TOCAR').esValido).toBe(true);
		});
	});

	it('bonifica el 4-3-3 válido y castiga el cierre falso', () => {
		expect(regla.efectoCierre({ esValido: true }, 'GANAR_4_3_3').ajustePuntos).toBe(-10);
		expect(regla.efectoCierre({ esValido: false }, 'GANAR_4_3_3').ajustePuntos).toBe(3);
	});

	it('penaliza a cada rival con los puntos de sus cartas no combinadas', () => {
		const { penalizaciones } = regla.liquidarRonda([
			{ jugadorId: 'p2', grupos: [TERNAS[0], [c(2, 'CLUB'), c(9, 'HEART'), c(4, 'SPADE')]], sobrantes: [] },
			{ jugadorId: 'p3', grupos: TERNAS, sobrantes: [c(13, 'DIAMOND')] },
		]);
		expect(penalizaciones).toEqual({ p2: 15, p3: 10 });
	});

	describe('marcador acumulado multironda', () => {
		/** Simula varias rondas acumulando penalizaciones sobre el mismo marcador. */
		function jugarRondas(rondas: Array<Record<string, number>>): Marcador {
			return rondas.reduce<Record<string, number>>((marcador, penalizaciones) => {
				Object.entries(penalizaciones).forEach(([id, p]) => (marcador[id] = (marcador[id] ?? 0) + p));
				return marcador;
			}, {});
		}

		it('la partida sigue mientras haya dos o más jugadores por debajo de 101', () => {
			const marcador = jugarRondas([{ p1: 0, p2: 40, p3: 30 }, { p1: 0, p2: 50, p3: 20 }]);
			expect(regla.evaluarDesenlace(marcador, 'p1')).toEqual({ terminada: false, eliminados: [] });
		});

		it('elimina a quien llega a 101 o más', () => {
			const marcador = jugarRondas([{ p1: 0, p2: 60, p3: 30 }, { p1: 0, p2: 41, p3: 20 }]);
			expect(marcador.p2).toBe(101);
			expect(regla.evaluarDesenlace(marcador, 'p1')).toEqual({ terminada: false, eliminados: ['p2'] });
		});

		it('termina cuando queda un solo jugador activo', () => {
			const marcador = jugarRondas([{ p1: 0, p2: 101, p3: 120 }]);
			expect(regla.evaluarDesenlace(marcador, 'p1')).toEqual({ terminada: true, ganadorId: 'p1', eliminados: ['p2', 'p3'] });
		});

		it('gana quien baja a -51 o menos', () => {
			expect(regla.evaluarDesenlace({ p1: -51, p2: 10, p3: 20 }, 'p1')).toEqual({ terminada: true, ganadorId: 'p1', eliminados: [] });
		});
	});
});
