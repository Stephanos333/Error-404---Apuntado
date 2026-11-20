import { Inject, Injectable, Logger } from '@nestjs/common';
import { DatabaseConstants } from '../../database/database.constants';
import { Model, PipelineStage } from 'mongoose';
import { PlayerDocument } from '../../database/player.schema';
import { Player, PlayerDTO } from '../../dominio/player/player';
import { UserId } from '../../dominio/user/user-id';
import { GameId } from '../../dominio/game/game-id';
import { UserIsAlreadyPlayingException } from '../../dominio/user/exceptions/user-is-already-playing.exception';
import { PlayerNotFoundException } from '../../dominio/player/exceptions/player-not-found.exception';
import { PlayerId } from '../../dominio/player/player-id';
import { PlayerStatusConstants } from '../../dominio/player/player-status.constants';
import { PlayerWithUserDTO } from '../../dominio/player/player-with-user.dto';
import { PlayerQueries } from './player.queries';
import { Match } from '../../dominio/match/match';
import { Card } from '../../card/card';
import { Trips } from '../../card/trips';
import { Quads } from '../../card/quads';
import { Game } from '../../dominio/game/game';
import { GameStatusConstants } from '../../dominio/game/game-status.constants';
import { InvalidGameStatusException } from '../../dominio/game/exceptions/invalid-game-status.exception';
import { MatchStatusConstants } from '../../dominio/match/match-status.constants';
import { InvalidMatchStatusException } from '../../dominio/match/exceptions/invalid-match-status.exception';
import { PlayerDoesNotHaveThisCardException } from '../../dominio/player/exceptions/player-does-not-have-this-card.exception';
import { InvalidPlayerStatusException } from '../../dominio/player/exceptions/invalid-player-status.exception';
import { PlayerAlreadyPullCardException } from '../../dominio/player/exceptions/player-already-pull-card.exception';
import { CardWithDesign } from '../../card/card-with-design';
import { PlayerHasNotPulledCardException } from '../../dominio/player/exceptions/player-has-not-pulled-card.exception';
import { PlayerCanNoLongerTryToWinException } from '../../dominio/player/exceptions/player-can-no-longer-try-to-win.exception';
import { aCarta, aCartas } from '../../card/carta.mapper';
import { RegistroReglas } from '../../reglas/registro/registro-reglas';
import {
	ManoDeclarada,
	ManoRival,
	Marcador,
	ReglaJuegoPlugin,
	ResultadoValidacion,
	TipoCierre,
} from '../../reglas/contrato/regla-juego.plugin';

/**
 * Los servicios asociados a los jugadores.
 *
 * Orquesta los turnos sin conocer ninguna modalidad concreta: obtiene la regla del juego
 * desde el `RegistroReglas` y aplica las decisiones que devuelve el plug-in (ADR-03).
 */
@Injectable()
export class PlayerService {
	/**
	 * Cierre que admite el API actual (trips1 + trips2 + quads + kicker).
	 */
	static readonly WIN_CLOSURE: TipoCierre = 'GANAR_4_3_3';

	private readonly logger: Logger = new Logger(PlayerService.name);

	/**
	 * @param {Model<PlayerDocument>} model Modelo para interactuar con la
	 * base de datos de los jugadores.
	 * @param {RegistroReglas} registroReglas Registro de los plug-ins de reglas.
	 */
	constructor(
		@Inject(DatabaseConstants.PLAYER_PROVIDER) private readonly model: Model<PlayerDocument>,
		private readonly registroReglas: RegistroReglas,
	) {}

	/**
	 * Traduce las cartas de un jugador que no cerró la ronda al contrato de reglas.
	 * @param {Player} player El jugador.
	 * @returns {ManoRival} La mano del jugador en el contrato.
	 * @static
	 */
	static toRivalHand(player: Player): ManoRival {
		return {
			jugadorId: player.playerId.toString(),
			grupos: [aCartas(player.trips1), aCartas(player.trips2), aCartas(player.quads)],
			sobrantes: [],
		};
	}

	/**
	 * Función reutilizable para validar si un jugador puede jalar una carta.
	 * @param {Player} player El usuario que se quiere validar.
	 * @param {Match} match La partida en la que se está validando.
	 * @static
	 * @throws {InvalidMatchStatusException} Cuando se intenta jalar del mazo en una partida que no se está jugando, ni tocando.
	 * @throws {InvalidPlayerStatusException} Cuando un usuario que no está en turno ejecuta la acción.
	 * @throws {PlayerAlreadyPullCardException} Cuando un usuario ya tiene una carta sobrante.
	 */
	static async validateIfPlayerCanPullCard(player: Player, match: Match): Promise<void> {
		if (!match.status.is(MatchStatusConstants.PLAYING) && !match.status.is(MatchStatusConstants.TOUCHING)) {
			throw new InvalidMatchStatusException();
		}
		if (!player.status.is(PlayerStatusConstants.IN_TURN)) throw new InvalidPlayerStatusException();
		if (player.kicker) throw new PlayerAlreadyPullCardException();
	}

	/**
	 * Función reutilizable que válida sin usuario tiene una carta.
	 * @param {Map<string, number>} cardsMap El map de cartas del usuario.
	 * @param {Card} card la carta que se está validando.
	 * @param {string[]} [combination] Un arreglo opcional para guardar la combinación de cartas.
	 * @throws {PlayerDoesNotHaveThisCardException} Cuando el jugador no tiene la carta.
	 */
	static validateIfPlayerHasCard(cardsMap: Map<string, number>, card: Card, combination?: string[]): void {
		const cardIdentifier: string = card.type.toString() + card.suit.toString();
		if (cardsMap.has(cardIdentifier)) {
			const total: number = cardsMap.get(cardIdentifier);
			if (total <= 0) throw new PlayerDoesNotHaveThisCardException();
			cardsMap.set(cardIdentifier, total - 1);
		}
		if (combination) combination.push(`${card.type.toString()}-${card.suit.toString()}`);
	}

	/**
	 * Función reutilizable que válida si las cartas de un jugador le permiten cerrar la ronda.
	 * La decisión la toma la regla del juego; aquí solo se valida que el jugador tenga las cartas.
	 * @param {Player} player El jugador que se está validando.
	 * @param {ReglaJuegoPlugin} rule La regla del juego.
	 * @param {Trips} trips1 La primera terna del jugador.
	 * @param {Trips} trips2 La segunda terna del jugador.
	 * @param {Quads} quads La cuarta del jugador.
	 * @param {Card} kicker La carta que el jugador descarta al cerrar.
	 * @returns {ResultadoValidacion} El resultado de la regla.
	 * @throws {PlayerDoesNotHaveThisCardException} Cuando el jugador declara una carta que no tiene.
	 */
	validateIfCanWin(
		player: Player,
		rule: ReglaJuegoPlugin,
		trips1: Trips,
		trips2: Trips,
		quads: Quads,
		kicker: Card,
	): ResultadoValidacion {
		const cardsMapCopy: Map<string, number> = new Map(player.cardsMap);
		[kicker, ...trips1, ...trips2, ...quads].forEach((c) => PlayerService.validateIfPlayerHasCard(cardsMapCopy, c));
		const hand: ManoDeclarada = {
			grupos: [aCartas(quads), aCartas(trips1), aCartas(trips2)],
			sobrantes: [],
			descarte: aCarta(kicker),
		};
		const result: ResultadoValidacion = rule.validarCierre(hand, PlayerService.WIN_CLOSURE);
		this.logger.log(
			`[${this.validateIfCanWin.name}] RULE :: ${rule.descriptor.id} VALID :: ${result.esValido} ${result.motivo ?? ''}`,
		);
		return result;
	}

	/**
	 * Función que permite crear un jugador.
	 * @param {UserId} userId El id del usuario.
	 * @param {GameId} gameId El juego al que se asocia el jugador.
	 * @param {boolean} [validateUser=true] Determina si se debe validar el usuario.
	 * @returns {Player} El usuario creado.
	 */
	async create(userId: UserId, gameId: GameId, validateUser: boolean = true): Promise<Player> {
		this.logger.log(`[${this.create.name}] INIT :: userId: ${userId.toString()}, gameId: ${gameId.toString()}`);
		if (validateUser && (await this.getActiveByUserId(userId, false))) throw new UserIsAlreadyPlayingException();
		const player: Player = await Player.fromDTO({
			gameId: gameId.toString(),
			isActive: true,
			playerId: PlayerId.create(),
			status: PlayerStatusConstants.WAITING_GAME,
			userId: userId.toString(),
			triedToWin: false,
		});
		await new this.model(await player.toDTO()).save();
		this.logger.log(`[${this.create.name}] FINISH ::`);
		return player;
	}

	/**
	 * Función que permite repartir las cartas a los jugadores de una partida.
	 * La cantidad de cartas la define la regla del juego.
	 * @param {Match} match La partida en la que se reparten las cartas.
	 * @param {string} [ruleId] La regla del juego; si se omite se usa la predeterminada.
	 * @returns {Match} La partida después de haber repartido las cartas.
	 */
	async dealCards(match: Match, ruleId?: string): Promise<Match> {
		this.logger.log(`[${this.dealCards.name}] INIT :: match: ${match.matchId.toString()}`);
		const { cartasPorJugador, cartasJugadorInicial } = this.registroReglas.obtener(ruleId).configuracionReparto();
		const turns: number[] = Array.from({ length: match.currentPlayers }, (_, i) => i + 1);
		for (const player of await this.getByGame(match.gameId)) {
			const cardsMap: Map<string, number> = new Map<string, number>();
			const position: number = turns[Math.floor(Math.random() * turns.length)];
			turns.splice(turns.indexOf(position), 1);
			player.position = position;
			player.changeStatus(position === 1 ? PlayerStatusConstants.IN_TURN : PlayerStatusConstants.WAITING_TURN);
			player.score = 0;

			const trip1: Card[] = [],
				trip2: Card[] = [],
				quads: Card[] = [];

			for (let i = 0; i < (position === 1 ? cartasJugadorInicial : cartasPorJugador); i++) {
				const random: number = Math.floor(Math.random() * match.cardDeck.cards.length);
				const card: Card = match.cardDeck.cards[random];
				if (i < 3) trip1.push(card);
				else if (i < 6) trip2.push(card);
				else if (i < 10) quads.push(card);
				else player.kicker = card;
				match.cardDeck.cards.splice(random, 1);

				const mapId: string = card.type.toString() + card.suit.toString();
				if (cardsMap.has(mapId)) cardsMap.set(mapId, cardsMap.get(mapId) + 1);
				else cardsMap.set(mapId, 1);
			}

			player.trips1 = trip1 as Trips;
			player.trips2 = trip2 as Trips;
			player.quads = quads as Quads;
			player.kicker = null;
			player.cardsMap = cardsMap;
			await this.update(player);
		}
		this.logger.log(`[${this.dealCards.name}] FINISH ::`);
		return match;
	}

	/**
	 * Función que permite que un usuario pase el turno en una partida.
	 * - Actualiza el jugador con el turno actual.
	 * - Determina el jugador con el turno siguiente.
	 * @param {UserId} userId El usuario que pasa el turno.
	 * @param {Game} game El juego en el que se está pasando turno.
	 * @param {Match} match La partida actual del juego.
	 * @param {Trips} trips1 La nueva terna 1 del jugador.
	 * @param {Trips} trips2 La nueva terna 2 del jugador.
	 * @param {Quads} quads La nueva cuarta del jugador.
	 * @param {Card} kicker La sobrante del jugador.
	 * @returns {Player} El jugador actualizado.
	 * @throws {InvalidGameStatusException} Cuando se intenta pasar turno en un juego que no está activo.
	 * @throws {InvalidMatchStatusException} Cuando se intenta pasar turno en una partida en la que no se está jugando.
	 * @throws {InvalidPlayerStatusException} Cuando un usuario que no está en turno ejecuta la acción.
	 * @throws {PlayerDoesNotHaveThisCardException} Cuando se intenta actualizar la posición de una carta que no tiene el jugador.
	 */
	async passShift(
		userId: UserId,
		game: Game,
		match: Match,
		trips1: Trips,
		trips2: Trips,
		quads: Quads,
		kicker: Card,
	): Promise<{ player: Player; nextPlayer: Player }> {
		this.logger.log(`[${this.passShift.name}] INIT :: userId: ${userId?.toString()}`);
		if (!game.status.is(GameStatusConstants.ACTIVE)) throw new InvalidGameStatusException();
		if (!match.status.is(MatchStatusConstants.PLAYING)) throw new InvalidMatchStatusException();
		const player: Player = await this.getActiveByUserId(userId);
		if (!player.status.is(PlayerStatusConstants.IN_TURN)) throw new InvalidPlayerStatusException();

		/* Las validaciones del usuario. */
		const cardsMapCopy: Map<string, number> = new Map(player.cardsMap);
		trips1.forEach((c) => PlayerService.validateIfPlayerHasCard(cardsMapCopy, c));
		trips2.forEach((c) => PlayerService.validateIfPlayerHasCard(cardsMapCopy, c));
		quads.forEach((c) => PlayerService.validateIfPlayerHasCard(cardsMapCopy, c));
		PlayerService.validateIfPlayerHasCard(cardsMapCopy, kicker);
		player.trips1 = trips1;
		player.trips2 = trips2;
		player.quads = quads;
		player.kicker = null;
		player.triedToWin = false;
		player.changeStatus(PlayerStatusConstants.WAITING_TURN);

		/* Ajusta los datos del siguiente jugador. */
		const nextPlayer: Player = await this.getByGameAndPosition(game.gameId, match.getNextPosition(player.position));
		nextPlayer.changeStatus(PlayerStatusConstants.IN_TURN);

		await this.update(player);
		await this.update(nextPlayer);

		this.logger.log(`[${this.passShift.name}] FINISH ::`);
		return { player, nextPlayer };
	}

	/**
	 * Permite que un usuario jale una carta desde el mazo.
	 * @param {UserId} userId El usuario que está jalando la carta del mazo.
	 * @param {Match} match La partida en la que se está jalando la carta.
	 * @returns Retorna el jugador y la partida actualizados.
	 */
	async pullFromCardDeck(
		userId: UserId,
		match: Match,
	): Promise<{
		player: Player;
		match: Match;
		filledDeck: boolean;
	}> {
		this.logger.log(
			`[${this.pullFromCardDeck.name}] INIT :: user: ${userId.toString()} game: ${match.gameId.toString()}`,
		);
		const player: Player = await this.getActiveByUserId(userId);
		await PlayerService.validateIfPlayerCanPullCard(player, match);
		const pulledCard = match.pullFromDeck();
		player.kicker = pulledCard.card;
		await this.update(player);
		this.logger.log(`[${this.pullFromCardDeck.name}] FINISH ::`);
		return { player, match, filledDeck: pulledCard.filledDeck };
	}

	/**
	 * Permite a un jugador jalar una carta desde las cartas desechadas.
	 * @param {UserId} userId El usuario que está jalando la carta de las cartas desechadas.
	 * @param {Match} match La partida en la que se está jalando la carta.
	 * @returns Retorna el jugador y la partida actualizados.
	 */
	async pullFromDiscardedCards(userId: UserId, match: Match): Promise<{ player: Player; match: Match }> {
		this.logger.log(`[${this.pullFromDiscardedCards.name}] INIT :: user: ${userId.toString()}`);
		const player: Player = await this.getActiveByUserId(userId);
		await PlayerService.validateIfPlayerCanPullCard(player, match);
		const pulledCard: CardWithDesign = match.pullFromDiscardedCards();
		player.kicker = pulledCard.toCard();
		await this.update(player);
		this.logger.log(`[${this.pullFromDiscardedCards.name}] FINISH ::`);
		return { player, match };
	}

	/**
	 * Determina y realiza los procesos necesarios cuando un jugador puede ganar una partida.
	 * La regla del juego decide si el cierre es válido y cuántos puntos se ajustan.
	 * @param {UserId} userId El usuario que puede ganar la partida.
	 * @param {Game} game El juego al que pertenece la partida (define la regla).
	 * @param {Match} match La partida en la que se está ganando.
	 * @param {Trips} trips1 La primera terna del jugador.
	 * @param {Trips} trips2 La segunda terna del jugador.
	 * @param {Quads} quads La cuarta del jugador.
	 * @param {Card} kicker La sobrante del jugador.
	 * @returns Los datos actualizados.
	 * @throws {PlayerHasNotPulledCardException} Cuando el usuario aún no ha jalado carta.
	 * @throws {InvalidPlayerStatusException} Cuando el usuario no se encuentra en turno.
	 * @throws {PlayerCanNoLongerTryToWinException} Cuando el jugador ya no puede intentar ganar más veces por su turno actual.
	 */
	async winMatch(
		userId: UserId,
		game: Game,
		match: Match,
		trips1: Trips,
		trips2: Trips,
		quads: Quads,
		kicker: Card,
	): Promise<{
		canWin: boolean;
		player: Player;
		match: Match;
	}> {
		this.logger.log(`[${this.winMatch.name}] INIT :: user: ${userId.toString()}`);
		const rule: ReglaJuegoPlugin = this.registroReglas.obtener(game.ruleId);
		const player: Player = await this.getActiveByUserId(userId);
		if (!player.kicker) throw new PlayerHasNotPulledCardException();
		if (!player.status.is(PlayerStatusConstants.IN_TURN)) throw new InvalidPlayerStatusException();
		if (player.triedToWin) throw new PlayerCanNoLongerTryToWinException();
		const result: ResultadoValidacion = this.validateIfCanWin(player, rule, trips1, trips2, quads, kicker);
		const effect = rule.efectoCierre(result, PlayerService.WIN_CLOSURE);
		player.addPoints(effect.ajustePuntos);
		if (effect.terminaRonda) {
			player.status.change(PlayerStatusConstants.WAITING_GAME);
			player.triedToWin = false;
			match.status.change(MatchStatusConstants.CALCULATING_RESULTS);
			match.winner = player.playerId;
		} else {
			this.logger.log(`[${this.winMatch.name}] PLAYER CANT WIN ::`);
			player.triedToWin = true;
		}
		await this.update(player);
		this.logger.log(`[${this.winMatch.name}] FINISH ::`);
		return { canWin: effect.terminaRonda, player, match };
	}

	/**
	 * Actualiza los datos de un jugador.
	 * @param {Player} player El jugador que será actualizado.
	 */
	async update(player: Player): Promise<void> {
		this.logger.log(`[${this.update.name}] INIT :: id: ${player.playerId.toString()}`);
		const { playerId, ...toUpdate } = await player.toDTO();
		await this.model.updateOne({ playerId }, toUpdate);
		this.logger.log(`[${this.update.name}] FINISH ::`);
	}

	/**
	 * Función que liquida la ronda y actualiza a los jugadores que no la cerraron.
	 * La regla del juego calcula las penalizaciones y decide quién queda eliminado
	 * y si la partida terminó.
	 * @param {Game} game El juego en el que se actualizan los jugadores (define la regla).
	 * @param {Player} winner El jugador que cerró la ronda.
	 * @returns Los jugadores eliminados y si la partida terminó.
	 */
	async updateLoserPlayers(game: Game, winner: Player): Promise<{ losers: Player[]; gameWon: boolean }> {
		this.logger.log(`[${this.updateLoserPlayers.name}] INIT :: game: ${game?.gameId?.toString()}`);
		const rule: ReglaJuegoPlugin = this.registroReglas.obtener(game.ruleId);
		const found: PlayerDTO[] = await this.model.find({
			gameId: game.gameId.toString(),
			playerId: { $ne: winner.playerId.toString() },
			isActive: true,
		});
		const rivals: Player[] = await Promise.all(found.map((p) => Player.fromDTO(p)));
		const settlement = rule.liquidarRonda(rivals.map(PlayerService.toRivalHand));
		rivals.forEach((p) => p.addPoints(settlement.penalizaciones[p.playerId.toString()] ?? 0));
		const scoreboard: Marcador = Object.fromEntries([winner, ...rivals].map((p) => [p.playerId.toString(), p.score]));
		const outcome = rule.evaluarDesenlace(scoreboard, winner.playerId.toString());
		const losers: Player[] = [];
		await Promise.all(
			rivals.map(async (player) => {
				player.status.change(PlayerStatusConstants.WAITING_GAME);
				if (outcome.eliminados.includes(player.playerId.toString())) {
					player.status.change(PlayerStatusConstants.LOSER);
					player.isActive = false;
					losers.push(player);
				}
				await this.update(player);
			}),
		);
		this.logger.log(`[${this.updateLoserPlayers.name}] FINISH ::`);
		return { losers, gameWon: outcome.terminada };
	}

	/**
	 * Función que permite buscar un jugador por su userId y validar su existencia.
	 * @param {UserId} userId El jugador que se solicita.
	 * @param {boolean} [throwExceptionIfNotFound=true] Bandera para determinar si se debe lanzar
	 * una excepción cuando el jugador solicitado no existe.
	 * @returns {Promise<Player | undefined>} Se retorna el jugador solicitado cuando se encuentra,
	 * si la bandera throwExceptionIfNotFound=false y el jugador solicitado no existe se retorna undefined.
	 * @throws {PlayerNotFoundException} Se lanza cuando la bandera throwExceptionIfNotFound=true y el jugador solicitado
	 * no existe.
	 */
	async getActiveByUserId(userId: UserId, throwExceptionIfNotFound: boolean = true): Promise<Player | undefined> {
		this.logger.log(`[${this.getActiveByUserId.name}] INIT :: userId: ${userId.toString()}`);
		const found: PlayerDTO = await this.model.findOne({ userId: userId.toString(), isActive: true });
		const mapped: Player = found ? await Player.fromDTO(found) : undefined;
		if (throwExceptionIfNotFound && !mapped) throw new PlayerNotFoundException();
		this.logger.log(`[${this.getActiveByUserId.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Función que permite buscar todos los participantes de un juego.
	 * @param {GameId} gameId El juego solicitado.
	 * @returns {Promise<Player[]>} Los jugadores encontrados.
	 */
	async getByGame(gameId: GameId): Promise<Player[]> {
		this.logger.log(`[${this.getByGame.name}] INIT :: game: ${gameId?.toString()}`);
		const found: PlayerDocument[] = await this.model.find({ gameId: gameId.toString() });
		const mapped: Player[] = await Promise.all(found.map((p) => Player.fromDTO(p)));
		this.logger.log(`[${this.getByGame.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Función que permite buscar los participantes de un juego con la
	 * información de sus usuarios.
	 * @param {GameId} gameId El juego solicitado.
	 * @param {UserId} userId El usuario que ejecuta el servicio.
	 * @returns {Promise<Array<PlayerWithUserDTO>>} Los jugadores encontrados.
	 */
	async getWithUserByGame(gameId: GameId, userId: UserId): Promise<PlayerWithUserDTO[]> {
		this.logger.log(`[${this.getWithUserByGame.name}] INIT :: gameId: ${gameId.toString()}`);
		const query: Array<PipelineStage> = PlayerQueries.getWithUserByGame(gameId);
		const aggregateResponse: Array<PlayerWithUserDTO & { _id: string }> = await this.model.aggregate(query);
		const mapped: Array<PlayerWithUserDTO> = await Promise.all(
			aggregateResponse.map(async (e): Promise<PlayerWithUserDTO> => {
				return {
					cardDesignId: e.cardDesignId,
					cardDesignName: e.cardDesignName,
					icon: e.icon,
					isActive: e.isActive,
					playerId: e.playerId,
					position: e.position,
					score: e.score,
					status: e.status,
					userId: e.userId,
					username: e.username,
					isMarked: userId.toString() === e.userId,
				};
			}),
		);
		this.logger.log(`[${this.getWithUserByGame.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Busca un jugador por un juego y su posición.
	 * @param {GameId} gameId El juego al que pertenece el jugador.
	 * @param {number} position La posición del jugador solicitado.
	 * @param {boolean} [throwExceptionIfNotFound=true] Determina si se debe lanzar una excepción cuando un jugador no se encuentra.
	 * @throws {PlayerNotFoundException} Si el booleano throwExceptionIfNotFound es verdadero y el jugador no se encuentra.
	 * @returns {Player} El jugador solicitado.
	 */
	async getByGameAndPosition(
		gameId: GameId,
		position: number,
		throwExceptionIfNotFound: boolean = true,
	): Promise<Player> {
		this.logger.log(`[${this.getByGameAndPosition.name}] INIT :: game: ${gameId.toString()} pos: ${position}`);
		const found: PlayerDocument = await this.model.findOne({ gameId: gameId.toString(), position });
		const mapped: Player = found ? await Player.fromDTO(found) : undefined;
		if (throwExceptionIfNotFound && !mapped) throw new PlayerNotFoundException();
		this.logger.log(`[${this.getByGameAndPosition.name}] FINISH ::`);
		return mapped;
	}
}
