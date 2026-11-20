/**
 * Checklist 2, caso borde C sobre el agregado completo: la partida detecta el fin
 * exactamente al cruzar los umbrales al cerrar una ronda (cálculo en memoria, §2.4).
 * También cubre el caso borde A de punta a punta (castigo por cierre inválido).
 */
import { ReglaApuntadoPlugin } from '../../../plugins/apuntado';
import { CIERRE_GANADOR, MANO_GANADORA, PARAMETROS_PRUEBA, barajadorConPrimeras } from '../../../test/utils/partida.fixtures';
import { ResultadoTransicion, crearPartida, intentarCierre } from './comandos-partida';
import { Partida } from './partida';

const regla = new ReglaApuntadoPlugin();
const barajador = barajadorConPrimeras(MANO_GANADORA);

/** Partida Apuntado de 2 jugadores; j1 tiene la mano ganadora y j2 no organizó su mano. */
function partida(puntajes: { j1: number; j2: number }): Partida {
	const p = crearPartida(
		{
			id: '0000000000000000000000a1',
			codigoInvitacion: 'K7P2QX',
			nombre: 'Mesa',
			anfitrionId: '000000000000000000000101',
			configuracion: {
				modalidad: 'apuntado',
				plugin: { id: 'apuntado', version: '1.0.0' },
				cupo: 2,
				apuestaPorJugador: 20,
				visibilidad: 'PUBLICA',
				tipoEscalera: 'CON_VUELTA',
				comodinesActivos: false,
				reengancheActivo: false,
				victoriaNegativaActiva: true,
				parametros: PARAMETROS_PRUEBA,
			},
			jugadores: [
				{ jugadorId: 'j1', usuarioId: '000000000000000000000101', nombreUsuario: 'j1', posicion: 1 },
				{ jugadorId: 'j2', usuarioId: '000000000000000000000102', nombreUsuario: 'j2', posicion: 2 },
			],
			aportes: [],
			ahora: new Date(),
		},
		regla.configuracionReparto(),
		barajador,
	).partida;
	p.jugadores[0].puntaje = puntajes.j1;
	p.jugadores[1].puntaje = puntajes.j2;
	return p;
}

const cerrar = (p: Partida): ResultadoTransicion =>
	intentarCierre(p, 'j1', { tipo: 'GANAR_4_3_3', ...CIERRE_GANADOR }, regla, barajador, new Date());

/** Penalización que recibe j2 al cerrar j1 (sus 10 cartas sin organizar). */
const penalizacionRival = cerrar(partida({ j1: 0, j2: 0 })).partida.jugadores[1].puntaje;

describe('Caso borde C en el agregado: fin de partida en el umbral exacto', () => {
	it('la penalización del rival es positiva (todas sus cartas quedan sueltas)', () => {
		expect(penalizacionRival).toBeGreaterThan(0);
	});

	it('si el rival queda en 100 la partida continúa con la ronda 2', () => {
		const { partida: despues, finalizada } = cerrar(partida({ j1: 0, j2: 100 - penalizacionRival }));
		expect(finalizada).toBe(false);
		expect(despues.jugadores[1]).toMatchObject({ puntaje: 100, estado: 'ACTIVO' });
		expect(despues.rondaActual.numero).toBe(2);
	});

	it('si el rival llega a 101 exactos queda fuera y la partida termina con ganador', () => {
		const { partida: despues, finalizada, eventos } = cerrar(partida({ j1: 0, j2: 101 - penalizacionRival }));
		expect(finalizada).toBe(true);
		expect(despues.jugadores[1].puntaje).toBe(101);
		expect(despues).toMatchObject({ estado: 'FINALIZADA', ganadorId: 'j1' });
		expect(despues.marcador[0].puntos.find((p) => p.jugadorId === 'j2').eliminado).toBe(true);
		expect(eventos.map((e) => e.tipo)).toEqual(['RONDA_CERRADA', 'PARTIDA_FINALIZADA']);
	});

	it('si quien cierra baja a -50 la partida continúa', () => {
		const { finalizada, partida: despues } = cerrar(partida({ j1: -40, j2: 0 }));
		expect(despues.jugadores[0].puntaje).toBe(-50);
		expect(finalizada).toBe(false);
	});

	it('si quien cierra baja a -51 exactos gana la partida', () => {
		const { finalizada, partida: despues } = cerrar(partida({ j1: -41, j2: 0 }));
		expect(despues.jugadores[0].puntaje).toBe(-51);
		expect(finalizada).toBe(true);
		expect(despues.ganadorId).toBe('j1');
		expect(despues.jugadores.map((j) => j.estado)).toEqual(['GANADOR', 'PERDEDOR']);
	});
});

describe('Caso borde A en el agregado: cierre con 3 ternas incompletas', () => {
	it('se rechaza, suma el castigo y la ronda sigue en el mismo turno', () => {
		// Grupos de 3 que no combinan: 5-5-AS, 2-3-K y K-K-9.
		const datos = { tipo: 'GANAR_4_3_3' as const, grupos: [[0, 1, 4], [5, 6, 7], [8, 9, 10]], descarte: 3 };
		const { partida: despues, eventos, finalizada } = intentarCierre(partida({ j1: 0, j2: 0 }), 'j1', datos, regla, barajador, new Date());
		expect(finalizada).toBe(false);
		expect(eventos[0].tipo).toBe('CIERRE_FALLIDO');
		expect(despues.jugadores[0].puntaje).toBe(3);
		expect(despues.rondaActual).toMatchObject({ numero: 1, estado: 'EN_TURNOS', turno: { jugadorId: 'j1', intentoCierre: true } });
	});
});
