/**
 * Modelo de persistencia propio de la capa `database/` (inversión de dependencias).
 *
 * Los esquemas de Mongoose se definen sobre estas interfaces y no sobre los DTO del
 * dominio. Así `database/` no importa ningún módulo de dominio y deja de formar parte
 * del ciclo de dependencias (FF-03). Los DTO del dominio son estructuralmente
 * compatibles con estos registros, por lo que los servicios de `aplicacion/` pueden
 * convertir documentos en entidades sin acoplar la persistencia al dominio.
 */

/**
 * Registro persistido de una carta.
 */
export interface CardRecord {
	type: string;
	suit: string;
}

/**
 * Registro persistido de una carta con diseño.
 */
export interface CardWithDesignRecord extends CardRecord {
	cardDesignId: string;
	cardDesignName: string;
}

/**
 * Registro persistido de un mazo de cartas.
 */
export interface CardDeckRecord {
	cards: CardRecord[];
}

/**
 * Registro persistido de las cartas desechadas.
 */
export interface DiscardedCardsRecord {
	cards: CardWithDesignRecord[];
}

/**
 * Registro persistido de un diseño de carta.
 */
export interface CardDesignRecord {
	cardDesignId: string;
	name: string;
	isDefault: boolean;
	isActive: boolean;
	isFree: boolean;
	price?: number;
}

/**
 * Registro persistido de un juego.
 */
export interface GameRecord {
	gameId: string;
	creatorId: string;
	hostId: string;
	status: string;
	name: string;
	requiredPlayers: number;
	currentPlayers: number;
	betByPlayer: number;
	isPublic: boolean;
	wasInitiated: boolean;
	currentMatch?: string;
	ruleId?: string;
}

/**
 * Registro persistido de una partida.
 */
export interface MatchRecord {
	gameId: string;
	matchId: string;
	initialPlayers: number;
	currentPlayers: number;
	currentShift: number;
	totalShifts: number;
	status: string;
	discardedCards: DiscardedCardsRecord;
	cardDeck: CardDeckRecord;
	winner?: string;
}

/**
 * Registro persistido de un jugador.
 */
export interface PlayerRecord {
	playerId: string;
	gameId: string;
	userId: string;
	status: string;
	isActive: boolean;
	triedToWin: boolean;
	trips1?: [CardRecord, CardRecord, CardRecord];
	trips2?: [CardRecord, CardRecord, CardRecord];
	quads?: [CardRecord, CardRecord, CardRecord, CardRecord];
	score?: number;
	position?: number;
	kicker?: CardRecord;
	cardsMap?: Map<string, number>;
}

/**
 * Registro persistido de un usuario.
 */
export interface UserRecord {
	userId: string;
	password: string;
	status: string;
	username: string;
	icon: string;
	currentDesignId: string;
	currentDesignName: string;
	tokens: number;
	cardDesigns: Array<string>;
}
