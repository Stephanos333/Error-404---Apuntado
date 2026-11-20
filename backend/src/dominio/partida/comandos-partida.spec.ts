import { ReglaClasicaPlugin } from '../../../plugins/clasica';
import { ReglaApuntadoPlugin } from '../../../plugins/apuntado';
import { ReglaJuegoPlugin } from '../../reglas/contrato/regla-juego.plugin';
import { CIERRE_GANADOR, MANO_GANADORA, PARAMETROS_PRUEBA, barajadorConPrimeras, carta } from '../../../test/utils/partida.fixtures';
import { DatosNuevaPartida, crearPartida, descartar, intentarCierre, robar, validarGrupos } from './comandos-partida';
import { Partida } from './partida';
import { PartidaConflictException, PartidaInvalidaException } from './partida.exceptions';

const ID = '0000000000000000000000a1';
const barajador = barajadorConPrimeras(MANO_GANADORA);

function nuevaPartida(regla: ReglaJuegoPlugin, jugadores = 2): Partida {
	const datos: DatosNuevaPartida = {
		id: ID,
		codigoInvitacion: 'K7P2QX',
		nombre: 'Mesa de prueba',
		anfitrionId: '000000000000000000000101',
		configuracion: {
			modalidad: regla.descriptor.id,
			plugin: { id: regla.descriptor.id, version: regla.descriptor.version },
			cupo: jugadores,
			apuestaPorJugador: 20,
			visibilidad: 'PUBLICA',
			tipoEscalera: 'CON_VUELTA',
			comodinesActivos: false,
			reengancheActivo: false,
			victoriaNegativaActiva: regla.descriptor.multironda,
			parametros: PARAMETROS_PRUEBA,
		},
		jugadores: Array.from({ length: jugadores }, (_, i) => ({
			jugadorId: `j${i + 1}`,
			usuarioId: `00000000000000000000010${i + 1}`,
			nombreUsuario: `jugador${i + 1}`,
			posicion: i + 1,
		})),
		aportes: [],
		ahora: new Date('2026-11-20T00:00:00Z'),
	};
	return crearPartida(datos, regla.configuracionReparto(), barajador).partida;
}

const codigo = (fn: () => unknown): string => {
	try {
		fn();
	} catch (e) {
		return e.message;
	}
	return 'SIN_ERROR';
};

describe('Agregado Partida: comandos puros', () => {
	const clasica = new ReglaClasicaPlugin();
	const apuntado = new ReglaApuntadoPlugin();

	it('reparte 11 cartas al jugador inicial y 10 a los demás, y le da el turno con 11 cartas', () => {
		const partida = nuevaPartida(clasica, 3);
		expect(partida.rondaActual.manos.map((m) => m.cartas.length)).toEqual([11, 10, 10]);
		expect(partida.rondaActual.turno).toEqual({ jugadorId: 'j1', fase: 'CON_11_CARTAS', intentoCierre: false, numero: 1 });
		expect(partida.rondaActual.mazo).toHaveLength(52 - 31);
	});

	it('no muta el estado de entrada', () => {
		const partida = nuevaPartida(clasica);
		const copia = structuredClone(partida);
		descartar(partida, 'j1', 10);
		expect(partida).toEqual(copia);
	});

	it('descartar pasa el turno y deja la carta en el tope del pozo', () => {
		const { partida, eventos } = descartar(nuevaPartida(clasica), 'j1', 10, [[0, 1, 2, 3]]);
		expect(partida.rondaActual.turno).toMatchObject({ jugadorId: 'j2', fase: 'ESPERANDO_ROBO', numero: 2 });
		expect(partida.rondaActual.pozoDescarte).toEqual([carta('NUEVE', 'CORAZONES')]);
		expect(partida.rondaActual.manos[0].grupos).toEqual([[0, 1, 2, 3]]);
		expect(eventos[0].tipo).toBe('TURNO_CAMBIADO');
	});

	it('robar del descarte toma el tope; robar dos veces es una fase inválida', () => {
		const tras = descartar(nuevaPartida(clasica), 'j1', 10).partida;
		const { partida } = robar(tras, 'j2', 'DESCARTE', barajador);
		expect(partida.rondaActual.manos[1].cartas).toHaveLength(11);
		expect(partida.rondaActual.pozoDescarte).toHaveLength(0);
		expect(codigo(() => robar(partida, 'j2', 'MAZO', barajador))).toBe('FASE_DE_TURNO_INVALIDA');
	});

	it('un jugador fuera de turno recibe TURNO_NO_CORRESPONDE', () => {
		const partida = nuevaPartida(clasica);
		expect(() => intentarCierre(partida, 'j2', { tipo: 'GANAR_4_3_3', ...CIERRE_GANADOR }, clasica, barajador, new Date())).toThrow(
			PartidaConflictException,
		);
		expect(codigo(() => descartar(partida, 'j2', 0))).toBe('TURNO_NO_CORRESPONDE');
	});

	it('Clásica: un cierre válido liquida y finaliza la partida en el mismo cálculo', () => {
		const resultado = intentarCierre(nuevaPartida(clasica), 'j1', { tipo: 'GANAR_4_3_3', ...CIERRE_GANADOR }, clasica, barajador, new Date());
		expect(resultado.finalizada).toBe(true);
		expect(resultado.partida.estado).toBe('FINALIZADA');
		expect(resultado.partida.ganadorId).toBe('j1');
		expect(resultado.partida.jugadores.map((j) => j.estado)).toEqual(['GANADOR', 'PERDEDOR']);
		expect(resultado.partida.marcador).toEqual([]);
		expect(resultado.eventos.map((e) => e.tipo)).toEqual(['RONDA_CERRADA', 'PARTIDA_FINALIZADA']);
		expect(codigo(() => descartar(resultado.partida, 'j1', 0))).toBe('RONDA_YA_CERRADA');
	});

	it('Apuntado: un cierre válido bonifica, penaliza al rival, registra el marcador y reparte la ronda 2', () => {
		const resultado = intentarCierre(nuevaPartida(apuntado), 'j1', { tipo: 'GANAR_4_3_3', ...CIERRE_GANADOR }, apuntado, barajador, new Date());
		const [j1, j2] = resultado.partida.jugadores;
		expect(resultado.finalizada).toBe(false);
		expect(j1.puntaje).toBe(-10);
		expect(j2.puntaje).toBeGreaterThan(0);
		expect(resultado.partida.marcador).toHaveLength(1);
		expect(resultado.partida.rondaActual).toMatchObject({ numero: 2, posicionInicial: 2, turno: { jugadorId: 'j2' } });
	});

	it('un cierre inválido aplica el castigo de la regla y no permite reintentar en el mismo turno', () => {
		const datos = { tipo: 'GANAR_4_3_3' as const, grupos: [[0, 1, 2], [4, 5, 6], [7, 8, 9]], descarte: 10 };
		const { partida, eventos } = intentarCierre(nuevaPartida(apuntado), 'j1', datos, apuntado, barajador, new Date());
		expect(eventos[0].tipo).toBe('CIERRE_FALLIDO');
		expect(partida.jugadores[0].puntaje).toBe(3);
		expect(codigo(() => intentarCierre(partida, 'j1', datos, apuntado, barajador, new Date()))).toBe('YA_INTENTO_CIERRE_EN_EL_TURNO');
	});

	it('valida la organización de grupos', () => {
		expect(() => validarGrupos([[0, 0]], 11, [])).toThrow(PartidaInvalidaException);
		expect(() => validarGrupos([[0, 11]], 11, [])).toThrow(PartidaInvalidaException);
		expect(() => validarGrupos([[1], [2], [3], [4], [5]], 11, [])).toThrow(PartidaInvalidaException);
		expect(() => validarGrupos([[10]], 11, [10])).toThrow(PartidaInvalidaException);
		expect(() => validarGrupos('x', 11, [])).toThrow(PartidaInvalidaException);
		expect(validarGrupos([[0, 1, 2]], 11, [10])).toEqual([[0, 1, 2]]);
	});
});
