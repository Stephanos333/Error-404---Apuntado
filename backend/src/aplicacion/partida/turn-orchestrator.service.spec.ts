/**
 * ADR-05 cumplimiento: "si guardar() falla, NO se publica ningún evento" (persistir antes
 * de notificar). El orquestador se prueba con dobles de la persistencia y un plug-in real.
 */
import { Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Model } from 'mongoose';
import { TurnOrchestrator } from './turn-orchestrator.service';
import { aRegistro } from './partida.mapper';
import { PartidaRepository } from '../../database/partida.repository';
import { AsientosTokensRepository } from '../../database/asientos-tokens.repository';
import { UnidadDeTrabajo } from '../../database/unidad-de-trabajo';
import { GameRecord, PlayerRecord, UserRecord } from '../../database/database.records';
import { RegistroReglas } from '../../reglas/registro/registro-reglas';
import { crearPartida } from '../../dominio/partida/comandos-partida';
import { Partida } from '../../dominio/partida/partida';
import { ReglaApuntadoPlugin } from '../../../plugins/apuntado';
import { CIERRE_GANADOR, MANO_GANADORA, PARAMETROS_PRUEBA, barajadorConPrimeras } from '../../../test/utils/partida.fixtures';

const barajador = barajadorConPrimeras(MANO_GANADORA);
const regla = new ReglaApuntadoPlugin();

function partidaInicial(): Partida {
	return crearPartida(
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
				{ jugadorId: 'u1', usuarioId: '000000000000000000000101', nombreUsuario: 'u1', posicion: 1 },
				{ jugadorId: 'u2', usuarioId: '000000000000000000000102', nombreUsuario: 'u2', posicion: 2 },
			],
			aportes: [],
			ahora: new Date(),
		},
		regla.configuracionReparto(),
		barajador,
	).partida;
}

function orquestador(actualizar: jest.Mock, publish: jest.Mock): TurnOrchestrator {
	const partida = partidaInicial();
	const partidas = { buscarPorId: jest.fn().mockResolvedValue(aRegistro(partida)), actualizarSiCoincide: actualizar } as unknown as PartidaRepository;
	const registro = new RegistroReglas();
	registro.registrar(regla);
	return new TurnOrchestrator(
		partidas,
		{} as AsientosTokensRepository,
		{} as UnidadDeTrabajo,
		registro,
		{ publish } as unknown as EventBus,
		barajador,
		PARAMETROS_PRUEBA,
		{} as Model<UserRecord>,
		{} as Model<GameRecord>,
		{} as Model<PlayerRecord>,
	);
}

const comando = { salaId: 'sala-1', partidaId: '0000000000000000000000a1', usuarioId: 'u1', version: 0, idComando: 'c-1' };

describe('TurnOrchestrator: persistir antes de notificar', () => {
	beforeAll(() => Logger.overrideLogger(false));

	it('publica los eventos solo después de una escritura confirmada', async () => {
		const publish = jest.fn();
		const resultado = await orquestador(jest.fn().mockResolvedValue(true), publish).intentarCierre(
			comando, 'GANAR_4_3_3', CIERRE_GANADOR.grupos, CIERRE_GANADOR.descarte,
		);
		expect(resultado.aplicado).toBe(true);
		expect(resultado.partida.version).toBe(1);
		expect(publish).toHaveBeenCalledTimes(1);
	});

	it('si guardar() falla no publica ningún evento', async () => {
		const publish = jest.fn();
		const fallo = jest.fn().mockRejectedValue(new Error('base de datos no disponible'));
		await expect(orquestador(fallo, publish).descartar(comando, 10)).rejects.toThrow('base de datos no disponible');
		expect(publish).not.toHaveBeenCalled();
	});

	it('si otro comando ganó la carrera responde con un error controlado y no publica', async () => {
		const publish = jest.fn();
		const sinCoincidencia = jest.fn().mockResolvedValue(false);
		await expect(orquestador(sinCoincidencia, publish).descartar(comando, 10)).rejects.toThrow('VERSION_DESACTUALIZADA');
		expect(publish).not.toHaveBeenCalled();
	});

	it('un reenvío de un idComando ya aplicado no escribe ni publica', async () => {
		const publish = jest.fn();
		const actualizar = jest.fn();
		const partida = { ...partidaInicial(), comandosRecientes: ['c-1'] };
		const servicio = orquestador(actualizar, publish);
		(servicio as unknown as { partidas: { buscarPorId: jest.Mock } }).partidas.buscarPorId.mockResolvedValue(aRegistro(partida));
		const resultado = await servicio.descartar(comando, 10);
		expect(resultado.aplicado).toBe(false);
		expect(actualizar).not.toHaveBeenCalled();
		expect(publish).not.toHaveBeenCalled();
	});
});
