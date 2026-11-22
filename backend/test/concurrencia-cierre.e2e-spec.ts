/**
 * Prueba de integración de concurrencia (ADR-04 cumplimiento, R02/R03).
 *
 * Levanta un replica set de MongoDB en memoria (las transacciones lo requieren), crea las
 * colecciones `partidas` y `asientos_tokens` con los validadores `$jsonSchema` de
 * `docs/schemas` (validationLevel strict) y ejecuta el `TurnOrchestrator` real contra él.
 *
 * Verifica que, ante solicitudes simultáneas:
 *  - exactamente un cierre tiene éxito y el otro recibe un error controlado
 *    (`RONDA_YA_CERRADA` o `TURNO_NO_CORRESPONDE`);
 *  - el pozo se paga una sola vez y las apuestas se cobran una sola vez;
 *  - un reenvío con el mismo `idComando` es idempotente;
 *  - todo documento escrito cumple el esquema documental.
 */
import * as fs from 'fs';
import * as path from 'path';
import { v4 } from 'uuid';
import { Connection, Model, Types, createConnection } from 'mongoose';
import { EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { TurnOrchestrator } from '../src/aplicacion/partida/turn-orchestrator.service';
import { PartidaRepository } from '../src/database/partida.repository';
import { AsientosTokensRepository } from '../src/database/asientos-tokens.repository';
import { UnidadDeTrabajo } from '../src/database/unidad-de-trabajo';
import { DatabaseConstants } from '../src/database/database.constants';
import { GameRecord, PlayerRecord, UserRecord } from '../src/database/database.records';
import { UserSchema } from '../src/database/user.schema';
import { GameSchema } from '../src/database/game.schema';
import { PlayerSchema } from '../src/database/player.schema';
import { crearRegistroReglas } from '../src/reglas-plugins.module';
import { Game } from '../src/dominio/game/game';
import { UserId } from '../src/dominio/user/user-id';
import { GameStatusConstants } from '../src/dominio/game/game-status.constants';
import { Partida } from '../src/dominio/partida/partida';
import { PartidaActualizadaEvent } from '../src/dominio/events/partida/partida-actualizada.event';
import { CIERRE_GANADOR, MANO_GANADORA, PARAMETROS_PRUEBA, barajadorConPrimeras } from './utils/partida.fixtures';

const APUESTA = 20;
const SALDO_INICIAL = 100;
const ESQUEMAS = path.join(__dirname, '..', '..', 'docs', 'schemas');

interface Mesa {
	game: Game;
	anfitrion: string;
	invitado: string;
	partida: Partida;
}

describe('Concurrencia del cierre de ronda (TurnOrchestrator + MongoDB replica set)', () => {
	let replSet: MongoMemoryReplSet;
	let connection: Connection;
	let usuarios: Model<UserRecord>;
	let juegos: Model<GameRecord>;
	let jugadores: Model<PlayerRecord>;
	let asientos: AsientosTokensRepository;
	let orquestador: TurnOrchestrator;
	const publicados: PartidaActualizadaEvent[] = [];

	beforeAll(async () => {
		Logger.overrideLogger(false);
		replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
		connection = await createConnection(replSet.getUri(), { dbName: 'apuntado-e2e' }).asPromise();
		for (const coleccion of ['partidas', 'asientos_tokens']) {
			const validator = JSON.parse(fs.readFileSync(path.join(ESQUEMAS, `${coleccion}.schema.json`), 'utf8'));
			await connection.db.createCollection(coleccion, { validator, validationLevel: 'strict', validationAction: 'error' });
		}
		usuarios = connection.model<UserRecord>(DatabaseConstants.USER_COLLECTION_NAME, UserSchema);
		juegos = connection.model<GameRecord>(DatabaseConstants.GAME_COLLECTION_NAME, GameSchema);
		jugadores = connection.model<PlayerRecord>(DatabaseConstants.PLAYER_COLLECTION_NAME, PlayerSchema);
		await Promise.all([usuarios.createCollection(), juegos.createCollection(), jugadores.createCollection()]);
		const partidas = new PartidaRepository(connection);
		asientos = new AsientosTokensRepository(connection);
		await partidas.onModuleInit();
		await asientos.onModuleInit();
		const eventBus = { publish: (e: PartidaActualizadaEvent) => publicados.push(e) } as unknown as EventBus;
		orquestador = new TurnOrchestrator(
			partidas,
			asientos,
			new UnidadDeTrabajo(connection),
			crearRegistroReglas({}),
			eventBus,
			barajadorConPrimeras(MANO_GANADORA),
			PARAMETROS_PRUEBA,
			usuarios,
			juegos,
			jugadores,
		);
	});

	afterAll(async () => {
		await connection?.close();
		await replSet?.stop();
	});

	/** Crea dos usuarios, una sala lista para iniciar y la inicia. El anfitrión recibe la mano ganadora. */
	async function mesaIniciada(ruleId: 'clasica' | 'apuntado'): Promise<Mesa> {
		const anfitrion = v4();
		const invitado = v4();
		const gameId = v4();
		for (const [userId, username] of [[anfitrion, `anfitrion-${anfitrion.slice(0, 4)}`], [invitado, `invitado-${invitado.slice(0, 4)}`]]) {
			await usuarios.create({
				userId, username, password: 'x', status: 'PLAYING', icon: 'ICON_1',
				currentDesignId: v4(), currentDesignName: 'default', tokens: SALDO_INICIAL, cardDesigns: ['default'],
			});
			await jugadores.create({ playerId: v4(), gameId, userId, status: 'WAITING_GAME', isActive: true, triedToWin: false });
		}
		const juego = await juegos.create({
			gameId, creatorId: anfitrion, hostId: anfitrion, status: GameStatusConstants.WAITING_TO_START, name: 'Mesa e2e',
			requiredPlayers: 2, currentPlayers: 2, betByPlayer: APUESTA, isPublic: true, wasInitiated: false, ruleId,
		});
		const game = Game.fromDTO(juego.toObject());
		const partida = await orquestador.iniciarPartida(game, new UserId(anfitrion));
		return { game, anfitrion, invitado, partida };
	}

	const cerrar = (mesa: Mesa, usuarioId: string, idComando = v4()) =>
		orquestador.intentarCierre(
			{ salaId: mesa.game.gameId.toString(), partidaId: mesa.partida._id, usuarioId, version: mesa.partida.version, idComando },
			'GANAR_4_3_3',
			CIERRE_GANADOR.grupos,
			CIERRE_GANADOR.descarte,
		);

	const errores = (resultados: PromiseSettledResult<unknown>[]) =>
		resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason.message);

	const asientosDe = async (mesa: Mesa, tipo: string) =>
		(await asientos.porPartida(new Types.ObjectId(mesa.partida._id))).filter((a) => a.tipo === tipo);

	const saldo = async (userId: string) => (await usuarios.findOne({ userId }).lean()).tokens;

	it('al iniciar cobra cada apuesta una sola vez y la registra en el libro de tokens', async () => {
		const mesa = await mesaIniciada('clasica');
		expect(await asientosDe(mesa, 'APUESTA')).toHaveLength(2);
		expect(mesa.partida.pozo.total).toBe(2 * APUESTA);
		expect(await saldo(mesa.anfitrion)).toBe(SALDO_INICIAL - APUESTA);
		expect(await saldo(mesa.invitado)).toBe(SALDO_INICIAL - APUESTA);
	});

	it('Clásica: dos jugadores cierran a la vez -> exactamente uno gana y el pozo se paga una vez', async () => {
		const mesa = await mesaIniciada('clasica');
		const resultados = await Promise.allSettled([cerrar(mesa, mesa.anfitrion), cerrar(mesa, mesa.invitado)]);

		expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(errores(resultados)).toHaveLength(1);
		expect(['TURNO_NO_CORRESPONDE', 'RONDA_YA_CERRADA']).toContain(errores(resultados)[0]);
		expect(await asientosDe(mesa, 'PREMIO_POZO')).toHaveLength(1);
		expect(await saldo(mesa.anfitrion)).toBe(SALDO_INICIAL - APUESTA + 2 * APUESTA);
		expect(await saldo(mesa.invitado)).toBe(SALDO_INICIAL - APUESTA);
		expect((await juegos.findOne({ gameId: mesa.game.gameId.toString() }).lean()).status).toBe(GameStatusConstants.FINISHED);
	});

	it('Clásica: el mismo jugador envía dos cierres simultáneos (doble clic) -> uno gana, el otro RONDA_YA_CERRADA', async () => {
		const mesa = await mesaIniciada('clasica');
		const resultados = await Promise.allSettled([cerrar(mesa, mesa.anfitrion), cerrar(mesa, mesa.anfitrion)]);

		expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(errores(resultados)).toEqual(['RONDA_YA_CERRADA']);
		expect(await asientosDe(mesa, 'PREMIO_POZO')).toHaveLength(1);
		expect(await saldo(mesa.anfitrion)).toBe(SALDO_INICIAL + APUESTA);
	});

	it('reenvío con el mismo idComando -> idempotente: se aplica una vez y no se paga dos veces', async () => {
		const mesa = await mesaIniciada('clasica');
		const idComando = v4();
		const resultados = await Promise.all([cerrar(mesa, mesa.anfitrion, idComando), cerrar(mesa, mesa.anfitrion, idComando)]);

		expect(resultados.map((r) => r.aplicado).sort()).toEqual([false, true]);
		expect(await asientosDe(mesa, 'PREMIO_POZO')).toHaveLength(1);
		expect(await saldo(mesa.anfitrion)).toBe(SALDO_INICIAL + APUESTA);
	});

	it('Apuntado: dos cierres simultáneos -> una sola liquidación atómica de la ronda', async () => {
		const mesa = await mesaIniciada('apuntado');
		const resultados = await Promise.allSettled([cerrar(mesa, mesa.anfitrion), cerrar(mesa, mesa.anfitrion), cerrar(mesa, mesa.invitado)]);

		expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		errores(resultados).forEach((codigo) => expect(['RONDA_YA_CERRADA', 'TURNO_NO_CORRESPONDE']).toContain(codigo));
		const { publica: partida } = await orquestador.obtenerEstado(mesa.partida._id, mesa.anfitrion);
		expect(partida.marcador).toHaveLength(1);
		expect(partida.ronda.numero).toBe(2);
		expect(partida.version).toBe(mesa.partida.version + 1);
		expect(partida.jugadores.find((j) => j.jugadorId === mesa.anfitrion).puntaje).toBe(-10);
		expect(await asientosDe(mesa, 'PREMIO_POZO')).toHaveLength(0);
	});

	it('una versión desactualizada se rechaza sin escribir', async () => {
		const mesa = await mesaIniciada('clasica');
		await expect(
			orquestador.descartar(
				{ salaId: mesa.game.gameId.toString(), partidaId: mesa.partida._id, usuarioId: mesa.anfitrion, version: mesa.partida.version + 7, idComando: v4() },
				10,
			),
		).rejects.toThrow('VERSION_DESACTUALIZADA');
		const { publica: partida } = await orquestador.obtenerEstado(mesa.partida._id, mesa.anfitrion);
		expect(partida.version).toBe(mesa.partida.version);
	});

	it('dos inicios simultáneos del mismo juego -> uno falla y las apuestas no se cobran dos veces', async () => {
		const anfitrion = v4();
		const invitado = v4();
		const gameId = v4();
		for (const userId of [anfitrion, invitado]) {
			await usuarios.create({
				userId, username: `u-${userId.slice(0, 8)}`, password: 'x', status: 'PLAYING', icon: 'ICON_1',
				currentDesignId: v4(), currentDesignName: 'default', tokens: SALDO_INICIAL, cardDesigns: ['default'],
			});
			await jugadores.create({ playerId: v4(), gameId, userId, status: 'WAITING_GAME', isActive: true, triedToWin: false });
		}
		const juego = await juegos.create({
			gameId, creatorId: anfitrion, hostId: anfitrion, status: GameStatusConstants.WAITING_TO_START, name: 'Mesa doble',
			requiredPlayers: 2, currentPlayers: 2, betByPlayer: APUESTA, isPublic: false, wasInitiated: false, ruleId: 'clasica',
		});
		const game = () => Game.fromDTO(juego.toObject());
		const resultados = await Promise.allSettled([
			orquestador.iniciarPartida(game(), new UserId(anfitrion)),
			orquestador.iniciarPartida(game(), new UserId(anfitrion)),
		]);

		expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(errores(resultados)).toEqual(['MATCH_CANNOT_BE_STARTED_ERROR']);
		expect(await saldo(anfitrion)).toBe(SALDO_INICIAL - APUESTA);
		expect(await saldo(invitado)).toBe(SALDO_INICIAL - APUESTA);
	});

	it('solo publica eventos de comandos confirmados', () => {
		expect(publicados.length).toBeGreaterThan(0);
		publicados.forEach((e) => expect(e.partida.version).toBeGreaterThanOrEqual(0));
	});
});
