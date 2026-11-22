/**
 * Prueba de contrato de mensajes (ADR-05, R04): ningún mensaje enviado a la sala pública
 * `partida:{id}` contiene manos, mazo ni cartas de los jugadores; cada sala privada
 * `usuario:{id}` recibe únicamente la mano de su dueño.
 */
import { ReglaApuntadoPlugin } from '../../../plugins/apuntado';
import { CIERRE_GANADOR, MANO_GANADORA, PARAMETROS_PRUEBA, barajadorConPrimeras } from '../../../test/utils/partida.fixtures';
import { EventoPartida, crearPartida, descartar, intentarCierre, robar } from '../../dominio/partida/comandos-partida';
import { Partida } from '../../dominio/partida/partida';
import { MensajePrivadoPartida, planificarNotificaciones } from './notificaciones-partida';
import { GameSocketConstants } from './game.socket.constants';

const CLAVES_PROHIBIDAS = ['manos', 'mazo', 'cartas', 'grupos', 'cardsMap', 'trips1', 'trips2', 'quads', 'kicker', 'cardDeck'];

/** Claves de un objeto, en profundidad. */
function clavesProfundas(valor: unknown): string[] {
	if (Array.isArray(valor)) return valor.flatMap(clavesProfundas);
	if (!valor || typeof valor !== 'object') return [];
	return Object.entries(valor).flatMap(([k, v]) => [k, ...clavesProfundas(v)]);
}

const regla = new ReglaApuntadoPlugin();
const barajador = barajadorConPrimeras(MANO_GANADORA);

function escenario(): Array<{ partida: Partida; eventos: EventoPartida[] }> {
	const inicio = crearPartida(
		{
			id: '0000000000000000000000a1',
			codigoInvitacion: 'K7P2QX',
			nombre: 'Mesa',
			anfitrionId: '000000000000000000000101',
			configuracion: {
				modalidad: 'apuntado',
				plugin: { id: 'apuntado', version: '1.0.0' },
				cupo: 3,
				apuestaPorJugador: 20,
				visibilidad: 'PUBLICA',
				tipoEscalera: 'CON_VUELTA',
				comodinesActivos: false,
				reengancheActivo: false,
				victoriaNegativaActiva: true,
				parametros: PARAMETROS_PRUEBA,
			},
			jugadores: ['u1', 'u2', 'u3'].map((id, i) => ({ jugadorId: id, usuarioId: `00000000000000000000010${i}`, nombreUsuario: id, posicion: i + 1 })),
			aportes: [],
			ahora: new Date(),
		},
		regla.configuracionReparto(),
		barajador,
	);
	const ctx = { regla, barajador, ahora: new Date() };
	const descarte = descartar(inicio.partida, 'u1', 10, undefined, ctx);
	const robo = robar(descarte.partida, 'u2', 'MAZO', barajador);
	const fallo = intentarCierre(robo.partida, 'u2', { tipo: 'GANAR_4_3_3', grupos: [[1, 2, 3]], descarte: 0 }, ctx);
	const otraMano = descartar(fallo.partida, 'u2', 0, undefined, ctx);
	return [inicio, descarte, robo, fallo, otraMano];
}

describe('Notificaciones de la partida: separación de salas pública y privada', () => {
	const envios = escenario().flatMap(({ partida, eventos }) => planificarNotificaciones('sala-1', partida, eventos));

	it('ningún mensaje de la sala pública contiene cartas privadas ni el mazo', () => {
		const publicos = envios.filter((e) => e.sala === 'partida:sala-1');
		expect(publicos.length).toBeGreaterThan(0);
		for (const envio of publicos) {
			expect(clavesProfundas(envio.contenido).filter((k) => CLAVES_PROHIBIDAS.includes(k))).toEqual([]);
		}
	});

	it('la vista pública solo informa el tamaño de cada mano', () => {
		const inicio = envios.find((e) => e.mensaje === GameSocketConstants.MATCH_STARTED_LISTENER);
		const jugadores = (inicio.contenido as { partida: { jugadores: Array<{ cartasEnMano: number }> } }).partida.jugadores;
		expect(jugadores.map((j) => j.cartasEnMano)).toEqual([11, 10, 10]);
	});

	it('SHIFT_CHANGED solo lleva la vista pública (antes enviaba la mano del siguiente jugador)', () => {
		const turno = envios.filter((e) => e.mensaje === GameSocketConstants.SHIFT_CHANGED_LISTENER);
		expect(turno.length).toBe(2);
		turno.forEach((e) => expect(e.sala).toBe('partida:sala-1'));
	});

	it('cada sala privada recibe únicamente la mano de su dueño', () => {
		const privados = envios.filter((e) => e.sala.startsWith('usuario:'));
		expect(privados.length).toBeGreaterThan(0);
		for (const envio of privados) {
			expect(envio.mensaje).toBe(GameSocketConstants.PRIVATE_HAND_LISTENER);
			expect(`usuario:${(envio.contenido as MensajePrivadoPartida).mano.jugadorId}`).toBe(envio.sala);
		}
	});

	it('al iniciar, cada jugador recibe su mano por su sala privada', () => {
		const [inicio] = escenario();
		const privados = planificarNotificaciones('sala-1', inicio.partida, inicio.eventos).filter((e) => e.sala.startsWith('usuario:'));
		expect(privados.map((e) => e.sala).sort()).toEqual(['usuario:u1', 'usuario:u2', 'usuario:u3']);
	});

	it('los mensajes de cartas privadas nunca se envían a la sala pública', () => {
		expect(envios.filter((e) => e.mensaje === GameSocketConstants.PRIVATE_HAND_LISTENER && !e.sala.startsWith('usuario:'))).toEqual([]);
	});

	it('el cierre de ronda se anuncia sin revelar las manos de los rivales', () => {
		const [inicio] = escenario();
		const cierre = intentarCierre(inicio.partida, 'u1', { tipo: 'GANAR_4_3_3', ...CIERRE_GANADOR }, { regla, barajador, ahora: new Date() });
		const publicos = planificarNotificaciones('sala-1', cierre.partida, cierre.eventos).filter((e) => e.sala === 'partida:sala-1');
		expect(publicos.map((e) => e.mensaje)).toEqual([GameSocketConstants.MATCH_WON_LISTENER, GameSocketConstants.ROUND_STARTED_LISTENER]);
		publicos.forEach((e) => expect(clavesProfundas(e.contenido).filter((k) => CLAVES_PROHIBIDAS.includes(k))).toEqual([]));
	});
});
