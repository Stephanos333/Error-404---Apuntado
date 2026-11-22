/**
 * Checklist 2 (Unit & Functional Testing, Richards & Ford cap. 24): casos borde de la guía
 * del Entregable 3, verificados sobre el contrato de los plug-ins.
 *
 *  A. Mano con 3 ternas incompletas: el cierre es inválido (ambas modalidades).
 *  B. Apuntado, tocar con 3 ternas y sobrante de EXACTAMENTE 5 puntos: se rechaza (< 5 estricto).
 *  C. Fin de partida exactamente en 101 puntos acumulados y victoria exactamente en -51.
 */
import { Carta, ManoDeclarada, Palo, ReglaJuegoPlugin } from '../src/reglas/contrato/regla-juego.plugin';
import { ReglaClasicaPlugin } from './clasica';
import { ReglaApuntadoPlugin } from './apuntado';

const c = (valor: number, palo: Palo): Carta => ({ valor, palo });

/** Tres ternas válidas: tres SIETE, escalera 2-3-4 de corazones y tres K. */
const TERNAS_VALIDAS: Carta[][] = [
	[c(7, 'CLUB'), c(7, 'HEART'), c(7, 'SPADE')],
	[c(2, 'HEART'), c(3, 'HEART'), c(4, 'HEART')],
	[c(13, 'CLUB'), c(13, 'DIAMOND'), c(13, 'SPADE')],
];

const apuntado: ReglaJuegoPlugin = new ReglaApuntadoPlugin();
const clasica: ReglaJuegoPlugin = new ReglaClasicaPlugin();

describe('Caso borde A: mano con 3 ternas incompletas', () => {
	/** Cada "terna" tiene solo 2 cartas que combinan y una tercera que rompe la combinación. */
	const incompletas: Carta[][] = [
		[c(7, 'CLUB'), c(7, 'HEART'), c(9, 'SPADE')],
		[c(2, 'HEART'), c(3, 'HEART'), c(5, 'HEART')],
		[c(13, 'CLUB'), c(12, 'DIAMOND'), c(1, 'SPADE')],
	];
	const tocar: ManoDeclarada = { grupos: incompletas, sobrantes: [c(2, 'CLUB')], descarte: c(10, 'CLUB') };
	const cuartaTerna: ManoDeclarada = {
		grupos: [[c(5, 'CLUB'), c(5, 'HEART'), c(5, 'SPADE'), c(6, 'DIAMOND')], incompletas[0], incompletas[1]],
		sobrantes: [],
		descarte: c(10, 'CLUB'),
	};

	it('Apuntado rechaza tocar con 3 ternas incompletas e informa el motivo', () => {
		const resultado = apuntado.validarCierre(tocar, 'TOCAR');
		expect(resultado.esValido).toBe(false);
		expect(resultado.motivo).toMatch(/3 ternas/);
	});

	it.each([['clasica', clasica], ['apuntado', apuntado]])('%s rechaza un 4-3-3 con grupos incompletos', (_, regla) => {
		expect(regla.validarCierre(cuartaTerna, 'GANAR_4_3_3').esValido).toBe(false);
	});

	it('grupos de 2 cartas tampoco cuentan como ternas', () => {
		const deDos = { ...tocar, grupos: TERNAS_VALIDAS.map((g) => g.slice(0, 2)) };
		expect(apuntado.validarCierre(deDos, 'TOCAR').esValido).toBe(false);
	});

	it('el cierre inválido no termina la ronda y aplica el castigo de la modalidad', () => {
		const efecto = apuntado.efectoCierre(apuntado.validarCierre(tocar, 'TOCAR'), 'TOCAR');
		expect(efecto).toEqual({ terminaRonda: false, rondaExtra: false, ajustePuntos: 3 });
	});
});

describe('Caso borde B: Apuntado, sobrante de exactamente 5 puntos', () => {
	const tocarCon = (sobrante: Carta): ManoDeclarada => ({ grupos: TERNAS_VALIDAS, sobrantes: [sobrante], descarte: c(10, 'CLUB') });

	it('rechaza la sobrante de 5 puntos (la regla exige estrictamente menos de 5)', () => {
		const resultado = apuntado.validarCierre(tocarCon(c(5, 'DIAMOND')), 'TOCAR');
		expect(resultado.esValido).toBe(false);
		expect(resultado.motivo).toMatch(/menos de 5/);
	});

	it('acepta la sobrante de 4 puntos (frontera inferior válida)', () => {
		expect(apuntado.validarCierre(tocarCon(c(4, 'DIAMOND')), 'TOCAR').esValido).toBe(true);
	});

	it('rechaza el A como sobrante (vale 10 puntos en la tabla del prototipo)', () => {
		expect(apuntado.validarCierre(tocarCon(c(1, 'DIAMOND')), 'TOCAR').esValido).toBe(false);
	});
});

describe('Caso borde C: umbrales de fin de partida (101 y -51)', () => {
	it('100 puntos no elimina; 101 exactos sí elimina y termina la partida de 2 jugadores', () => {
		expect(apuntado.evaluarDesenlace({ p1: 0, p2: 100 }, 'p1')).toEqual({ terminada: false, eliminados: [] });
		expect(apuntado.evaluarDesenlace({ p1: 0, p2: 101 }, 'p1')).toEqual({ terminada: true, ganadorId: 'p1', eliminados: ['p2'] });
	});

	it('con 3 jugadores, llegar a 101 elimina pero la partida continúa', () => {
		expect(apuntado.evaluarDesenlace({ p1: 0, p2: 101, p3: 40 }, 'p1')).toEqual({ terminada: false, eliminados: ['p2'] });
	});

	it('-50 no gana; -51 exactos gana la partida', () => {
		expect(apuntado.evaluarDesenlace({ p1: -50, p2: 10 }, 'p1')).toEqual({ terminada: false, eliminados: [] });
		expect(apuntado.evaluarDesenlace({ p1: -51, p2: 10 }, 'p1')).toEqual({ terminada: true, ganadorId: 'p1', eliminados: [] });
	});

	it('la Clásica no usa umbrales: termina en la primera ronda con cualquier marcador', () => {
		expect(clasica.evaluarDesenlace({ p1: 0, p2: 0 }, 'p1')).toMatchObject({ terminada: true, ganadorId: 'p1' });
	});
});
