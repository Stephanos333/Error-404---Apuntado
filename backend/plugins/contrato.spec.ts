/**
 * Suite de contrato parametrizada (ADR-03, cumplimiento).
 *
 * La misma batería de casos se ejecuta contra cada plug-in registrado. Demuestra que la
 * Clásica y el Apuntado cumplen el mismo contrato `ReglaJuegoPlugin` y que el núcleo puede
 * usarlos a través del `RegistroReglas` sin conocer su implementación concreta.
 */
import { Carta, ManoDeclarada, Palo, ReglaJuegoPlugin } from '../src/reglas/contrato/regla-juego.plugin';
import { RegistroReglas } from '../src/reglas/registro/registro-reglas';
import { ReglaClasicaPlugin } from './clasica';
import { ReglaApuntadoPlugin } from './apuntado';

const c = (valor: number, palo: Palo): Carta => ({ valor, palo });

/** 4-3-3 válido: cuarta de 5, escalera A-2-3 de picas y terna de K. */
const MANO_4_3_3: ManoDeclarada = {
	grupos: [
		[c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE'), c(5, 'DIAMOND')],
		[c(1, 'SPADE'), c(2, 'SPADE'), c(3, 'SPADE')],
		[c(13, 'CLUB'), c(13, 'HEART'), c(13, 'SPADE')],
	],
	sobrantes: [],
	descarte: c(9, 'HEART'),
};

/** 4-3-3 con escalera que cruza K -> A -> 2 (política con vuelta del prototipo). */
const MANO_CON_VUELTA: ManoDeclarada = {
	...MANO_4_3_3,
	grupos: [MANO_4_3_3.grupos[0], [c(13, 'HEART'), c(1, 'HEART'), c(2, 'HEART')], MANO_4_3_3.grupos[2]],
};

/** La segunda terna no combina. */
const MANO_INVALIDA: ManoDeclarada = {
	...MANO_4_3_3,
	grupos: [MANO_4_3_3.grupos[0], [c(1, 'SPADE'), c(7, 'HEART'), c(3, 'SPADE')], MANO_4_3_3.grupos[2]],
};

const PLUGINS: Array<[string, () => ReglaJuegoPlugin]> = [
	['clasica', () => new ReglaClasicaPlugin()],
	['apuntado', () => new ReglaApuntadoPlugin()],
];

describe.each(PLUGINS)('Contrato ReglaJuegoPlugin: %s', (id, crear) => {
	let regla: ReglaJuegoPlugin;
	beforeEach(() => (regla = crear()));

	it('expone un descriptor con id estable y versión de contrato compatible', () => {
		expect(regla.descriptor.id).toBe(id);
		expect(regla.descriptor.versionContrato).toMatch(/^1\.\d+\.\d+$/);
	});

	it('pasa la validación y la prueba de humo del registro', () => {
		const registro = new RegistroReglas();
		expect(() => registro.registrar(regla)).not.toThrow();
		expect(registro.obtener(id)).toBe(regla);
	});

	it('reparte 10 cartas y 11 al jugador que abre', () => {
		expect(regla.configuracionReparto()).toEqual({ cartasPorJugador: 10, cartasJugadorInicial: 11 });
	});

	it('permite el cierre 4-3-3', () => {
		expect(regla.cierresPermitidos()).toContain('GANAR_4_3_3');
	});

	it('acepta 1 cuarta + 2 ternas + 1 descarte, incluida la escalera con vuelta', () => {
		expect(regla.validarCierre(MANO_4_3_3, 'GANAR_4_3_3').esValido).toBe(true);
		expect(regla.validarCierre(MANO_CON_VUELTA, 'GANAR_4_3_3').esValido).toBe(true);
	});

	it('rechaza con motivo una mano cuyas combinaciones no son válidas', () => {
		const resultado = regla.validarCierre(MANO_INVALIDA, 'GANAR_4_3_3');
		expect(resultado.esValido).toBe(false);
		expect(resultado.motivo).toEqual(expect.any(String));
	});

	it('rechaza un cierre sin descarte', () => {
		expect(regla.validarCierre({ ...MANO_4_3_3, descarte: undefined }, 'GANAR_4_3_3').esValido).toBe(false);
	});

	it('un cierre válido termina la ronda; uno inválido no', () => {
		expect(regla.efectoCierre({ esValido: true }, 'GANAR_4_3_3').terminaRonda).toBe(true);
		expect(regla.efectoCierre({ esValido: false }, 'GANAR_4_3_3').terminaRonda).toBe(false);
	});

	it('liquida una penalización no negativa para cada rival', () => {
		const { penalizaciones } = regla.liquidarRonda([
			{ jugadorId: 'p2', grupos: MANO_INVALIDA.grupos, sobrantes: [] },
			{ jugadorId: 'p3', grupos: MANO_4_3_3.grupos, sobrantes: [] },
		]);
		expect(Object.keys(penalizaciones).sort()).toEqual(['p2', 'p3']);
		Object.values(penalizaciones).forEach((p) => expect(p).toBeGreaterThanOrEqual(0));
	});

	it('el desenlace solo elimina jugadores del marcador y nunca al ganador', () => {
		const desenlace = regla.evaluarDesenlace({ p1: -10, p2: 40, p3: 120 }, 'p1');
		desenlace.eliminados.forEach((e) => expect(['p1', 'p2', 'p3']).toContain(e));
		if (desenlace.ganadorId) expect(desenlace.eliminados).not.toContain(desenlace.ganadorId);
	});
});
