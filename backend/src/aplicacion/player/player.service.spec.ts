/**
 * El orquestador de turnos (`PlayerService`) funciona con cualquier implementación del
 * contrato: aquí se usa un stub, sin importar ningún plug-in concreto (ADR-03, FF-02).
 */
import { v4 } from 'uuid';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { PlayerService } from './player.service';
import { RegistroReglas } from '../../reglas/registro/registro-reglas';
import { ManoDeclarada, Marcador, ReglaJuegoPlugin } from '../../reglas/contrato/regla-juego.plugin';
import { PlayerDTO } from '../../dominio/player/player';
import { PlayerStatusConstants } from '../../dominio/player/player-status.constants';
import { MatchStatusConstants } from '../../dominio/match/match-status.constants';
import { Game } from '../../dominio/game/game';
import { GameId } from '../../dominio/game/game-id';
import { Match } from '../../dominio/match/match';
import { UserId } from '../../dominio/user/user-id';
import { Card } from '../../card/card';
import { Trips } from '../../card/trips';
import { Quads } from '../../card/quads';
import { PlayerDocument } from '../../database/player.schema';

const carta = (type: string, suit: string) => ({ type, suit });

function playerDTO(sobrescribir: Partial<PlayerDTO> = {}): PlayerDTO {
	return {
		playerId: v4(),
		gameId: GAME_ID,
		userId: v4(),
		status: PlayerStatusConstants.IN_TURN,
		isActive: true,
		triedToWin: false,
		score: 0,
		position: 1,
		trips1: [carta('C5', 'CLUB'), carta('C5', 'HEART'), carta('C5', 'SPADE')],
		trips2: [carta('A', 'SPADE'), carta('C2', 'SPADE'), carta('C3', 'SPADE')],
		quads: [carta('K', 'CLUB'), carta('K', 'HEART'), carta('K', 'SPADE'), carta('K', 'DIAMOND')],
		kicker: carta('C9', 'HEART'),
		...sobrescribir,
	};
}

const GAME_ID: string = v4();

/** Regla de prueba: el orquestador solo conoce el contrato. */
function reglaStub(sobrescribir: Partial<ReglaJuegoPlugin> = {}): jest.Mocked<ReglaJuegoPlugin> {
	return {
		descriptor: { id: 'stub', nombre: 'Stub', version: '1.0.0', versionContrato: '1.0.0', multironda: true },
		configuracionReparto: jest.fn(() => ({ cartasPorJugador: 10, cartasJugadorInicial: 11 })),
		cierresPermitidos: jest.fn(() => ['GANAR_4_3_3' as const]),
		validarCierre: jest.fn((mano: ManoDeclarada) => ({ esValido: mano.grupos.length === 3 })),
		efectoCierre: jest.fn((r) => ({ terminaRonda: r.esValido, rondaExtra: false, ajustePuntos: r.esValido ? -7 : 4 })),
		liquidarRonda: jest.fn(() => ({ penalizaciones: {} })),
		evaluarDesenlace: jest.fn(() => ({ terminada: false, eliminados: [] })),
		...sobrescribir,
	} as jest.Mocked<ReglaJuegoPlugin>;
}

function crearServicio(regla: ReglaJuegoPlugin, modelo: Partial<Record<'findOne' | 'find' | 'updateOne', jest.Mock>>): PlayerService {
	const registro = new RegistroReglas();
	registro.registrar(regla);
	const model = { updateOne: jest.fn().mockResolvedValue({}), ...modelo } as unknown as Model<PlayerDocument>;
	return new PlayerService(model, registro);
}

const game = { gameId: new GameId(GAME_ID), ruleId: 'stub' } as unknown as Game;
const nuevoMatch = () => ({ status: { change: jest.fn() }, winner: undefined }) as unknown as Match;
const cartas = <T>(dtos: Array<{ type: string; suit: string }>): T => dtos.map((d) => Card.fromDTO(d)) as T;

describe('PlayerService (orquestador) con un plug-in stub', () => {
	beforeAll(() => Logger.overrideLogger(false));

	it('winMatch delega la validación del cierre a la regla del juego y aplica su efecto', async () => {
		const dto = playerDTO();
		const regla = reglaStub();
		const servicio = crearServicio(regla, { findOne: jest.fn().mockResolvedValue(dto) });
		const match = nuevoMatch();

		const resultado = await servicio.winMatch(
			new UserId(dto.userId),
			game,
			match,
			cartas<Trips>(dto.trips1),
			cartas<Trips>(dto.trips2),
			cartas<Quads>(dto.quads),
			Card.fromDTO(dto.kicker),
		);

		expect(regla.validarCierre).toHaveBeenCalledWith(
			expect.objectContaining({ sobrantes: [], descarte: { valor: 9, palo: 'HEART' } }),
			'GANAR_4_3_3',
		);
		// La primera llamada es la prueba de humo del registro; la última es la del orquestador.
		const mano = regla.validarCierre.mock.lastCall[0];
		expect(mano.grupos.map((g) => g.length)).toEqual([4, 3, 3]);
		expect(resultado.canWin).toBe(true);
		expect(resultado.player.score).toBe(-7);
		expect(match.status.change).toHaveBeenCalledWith(MatchStatusConstants.CALCULATING_RESULTS);
	});

	it('winMatch marca el intento fallido y aplica el castigo que decida la regla', async () => {
		const dto = playerDTO();
		const regla = reglaStub({ validarCierre: jest.fn(() => ({ esValido: false, motivo: 'no' })) });
		const servicio = crearServicio(regla, { findOne: jest.fn().mockResolvedValue(dto) });
		const match = nuevoMatch();

		const resultado = await servicio.winMatch(
			new UserId(dto.userId),
			game,
			match,
			cartas<Trips>(dto.trips1),
			cartas<Trips>(dto.trips2),
			cartas<Quads>(dto.quads),
			Card.fromDTO(dto.kicker),
		);

		expect(resultado.canWin).toBe(false);
		expect(resultado.player.triedToWin).toBe(true);
		expect(resultado.player.score).toBe(4);
		expect(match.status.change).not.toHaveBeenCalled();
	});

	it('updateLoserPlayers aplica las penalizaciones y el desenlace que devuelve la regla', async () => {
		const ganador = playerDTO({ score: -10 });
		const rival = playerDTO({ status: PlayerStatusConstants.WAITING_TURN, score: 60, kicker: undefined });
		const regla = reglaStub({
			liquidarRonda: jest.fn(() => ({ penalizaciones: { [rival.playerId]: 45 } })),
			evaluarDesenlace: jest.fn(() => ({ terminada: true, ganadorId: ganador.playerId, eliminados: [rival.playerId] })),
		});
		const servicio = crearServicio(regla, {
			findOne: jest.fn().mockResolvedValue(ganador),
			find: jest.fn().mockResolvedValue([rival]),
		});
		const winner = await servicio.getActiveByUserId(new UserId(ganador.userId));

		const resultado = await servicio.updateLoserPlayers(game, winner);

		const marcador: Marcador = regla.evaluarDesenlace.mock.lastCall[0];
		expect(marcador).toEqual({ [ganador.playerId]: -10, [rival.playerId]: 105 });
		expect(resultado.gameWon).toBe(true);
		expect(resultado.losers).toHaveLength(1);
		expect(resultado.losers[0].status.is(PlayerStatusConstants.LOSER)).toBe(true);
	});

	it('dealCards usa la configuración de reparto de la regla', async () => {
		const regla = reglaStub({ configuracionReparto: jest.fn(() => ({ cartasPorJugador: 10, cartasJugadorInicial: 11 })) });
		const jugador = playerDTO({ status: PlayerStatusConstants.WAITING_GAME, trips1: undefined, trips2: undefined, quads: undefined, kicker: undefined });
		const servicio = crearServicio(regla, { find: jest.fn().mockResolvedValue([jugador]) });
		const mazo = Array.from({ length: 20 }, () => Card.fromDTO(carta('C7', 'CLUB')));
		const match = { matchId: { toString: () => 'm1' }, currentPlayers: 1, gameId: new GameId(GAME_ID), cardDeck: { cards: mazo } } as unknown as Match;

		await servicio.dealCards(match, 'stub');

		expect(regla.configuracionReparto).toHaveBeenCalled();
		expect(match.cardDeck.cards).toHaveLength(20 - 11);
	});
});
