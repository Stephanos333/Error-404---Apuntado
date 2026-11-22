/**
 * Modelo de persistencia propio de la capa `database/` (inversión de dependencias).
 *
 * Los esquemas de Mongoose y las colecciones nativas se definen sobre estas interfaces y
 * no sobre los tipos del dominio. Así `database/` no importa ningún módulo de dominio y
 * no forma parte de ningún ciclo de dependencias (FF-03). La capa `aplicacion/` traduce
 * entre estos registros y el dominio.
 */
import { Types } from 'mongoose';

/**
 * Registro persistido de una carta (modelo heredado del prototipo, colección `Player`).
 */
export interface CardRecord {
	type: string;
	suit: string;
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
 * Registro persistido de un juego (sala de espera).
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
	/** `_id` (hexadecimal) del documento de `partidas` creado al iniciar el juego. */
	partidaId?: string;
	ruleId?: string;
}

/**
 * Registro persistido de un jugador (membresía de la sala).
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

/**
 * Carta embebida del agregado `partidas` (`docs/schemas/partidas.schema.json`).
 */
export interface CartaPartidaRecord {
	valor: string;
	palo: string;
	baraja: number;
}

/**
 * Documento del agregado Partida (ADR-04). Sigue `docs/schemas/partidas.schema.json`;
 * los identificadores de MongoDB son `ObjectId`.
 */
export interface PartidaRecord {
	_id: Types.ObjectId;
	codigoInvitacion: string;
	nombre: string;
	estado: string;
	anfitrionId: Types.ObjectId;
	configuracion: {
		modalidad: string;
		plugin: { id: string; version: string };
		cupo: number;
		apuestaPorJugador: number;
		visibilidad: string;
		tipoEscalera: string;
		comodinesActivos: boolean;
		reengancheActivo: boolean;
		victoriaNegativaActiva: boolean;
		parametros: Record<string, number>;
	};
	jugadores: Array<{
		jugadorId: string;
		usuarioId: Types.ObjectId;
		nombreUsuario: string;
		posicion: number;
		estado: string;
		puntaje: number;
		usoReenganche: boolean;
		conectado: boolean;
		desconectadoDesde: Date | null;
	}>;
	pozo: {
		total: number;
		aportes: Array<{ usuarioId: Types.ObjectId; tipo: string; monto: number; asientoId: Types.ObjectId }>;
	};
	rondaActual: {
		numero: number;
		estado: string;
		posicionInicial: number;
		turno: { jugadorId: string; fase: string; intentoCierre: boolean; numero: number };
		mazo: CartaPartidaRecord[];
		pozoDescarte: CartaPartidaRecord[];
		manos: Array<{ jugadorId: string; cartas: CartaPartidaRecord[]; grupos: number[][] }>;
		rondaExtra: { tocadorId: string; pendientes: string[] } | null;
	} | null;
	marcador: Array<{
		numeroRonda: number;
		ganadorId: string;
		tipoCierre: string;
		puntos: Array<{
			jugadorId: string;
			puntosRonda: number;
			castigos: number;
			acumulado: number;
			eliminado: boolean;
			reenganchado: boolean;
		}>;
		cerradaEn: Date;
	}>;
	ganadorId: string | null;
	ventanaHasta: Date | null;
	comandosRecientes: string[];
	version: number;
	creadaEn: Date;
	actualizadaEn: Date;
	finalizadaEn: Date | null;
}

/**
 * Asiento del libro de tokens `asientos_tokens` (append-only, ADR-04).
 * `monto` positivo es crédito y negativo es débito. `referencia` es única (idempotencia).
 */
export interface AsientoTokensRecord {
	_id: Types.ObjectId;
	usuarioId: Types.ObjectId;
	tipo: 'SALDO_INICIAL' | 'APUESTA' | 'REEMBOLSO' | 'PREMIO_POZO' | 'REENGANCHE' | 'COMPRA_DISENO' | 'RECARGA';
	monto: number;
	referencia: string;
	partidaId: Types.ObjectId | null;
	en: Date;
}
