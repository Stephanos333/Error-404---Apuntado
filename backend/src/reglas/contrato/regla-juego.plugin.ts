/**
 * Contrato `@apuntado/contrato-reglas` v1 (ADR-03).
 *
 * Es la única interfaz que el núcleo conoce de las reglas del juego. Cada modalidad
 * (Clásica, Apuntado, ...) es un plug-in en `backend/plugins/<id>/` que implementa
 * `ReglaJuegoPlugin`. Todas las operaciones son puras: reciben datos y devuelven
 * decisiones, sin efectos secundarios ni dependencias de framework (FF-05).
 *
 * El núcleo no conoce los números de ninguna modalidad (101, -51, 5, ...): aplica las
 * decisiones que le devuelve el plug-in.
 */

/** Versión semver del contrato que ofrece el núcleo. */
export const VERSION_CONTRATO = '1.0.0';

/** Pintas de la baraja francesa. */
export type Palo = 'CLUB' | 'DIAMOND' | 'HEART' | 'SPADE';

/** Pintas válidas, en el orden en que se reparten. */
export const PALOS: readonly Palo[] = ['CLUB', 'DIAMOND', 'HEART', 'SPADE'];

/**
 * Carta en el lenguaje del contrato.
 * `valor` va de 1 (A) a 13 (K): J = 11, Q = 12, K = 13.
 */
export interface Carta {
	readonly valor: number;
	readonly palo: Palo;
}

/**
 * Tipos de cierre de una ronda.
 * - `GANAR_4_3_3`: 1 cuarta + 2 ternas + 1 descarte.
 * - `TOCAR`: 3 ternas + 1 sobrante de bajo valor + 1 descarte.
 */
export type TipoCierre = 'GANAR_4_3_3' | 'TOCAR';

/** Mano que un jugador declara al intentar cerrar la ronda. */
export interface ManoDeclarada {
	/** Combinaciones declaradas (ternas o cuartas). */
	readonly grupos: ReadonlyArray<ReadonlyArray<Carta>>;
	/** Cartas que no forman parte de ninguna combinación (sin contar el descarte). */
	readonly sobrantes: ReadonlyArray<Carta>;
	/** Carta que el jugador descarta al cerrar. */
	readonly descarte?: Carta;
}

/** Resultado de validar un cierre. */
export interface ResultadoValidacion {
	readonly esValido: boolean;
	/** Motivo del rechazo, legible para el jugador. */
	readonly motivo?: string;
}

/** Identificación del plug-in. */
export interface DescriptorRegla {
	/** Identificador estable; se congela en la partida al crearla. */
	readonly id: string;
	readonly nombre: string;
	/** Versión semver del plug-in. */
	readonly version: string;
	/** Versión semver del contrato con la que se compiló el plug-in. */
	readonly versionContrato: string;
	/** `true` si la partida se juega en varias rondas con marcador acumulado. */
	readonly multironda: boolean;
}

/** Cuántas cartas recibe cada jugador al repartir. */
export interface ConfiguracionReparto {
	readonly cartasPorJugador: number;
	/** El jugador que abre la ronda recibe una carta más para poder descartar. */
	readonly cartasJugadorInicial: number;
}

/** Decisión del plug-in sobre un intento de cierre. */
export interface EfectoCierre {
	/** La ronda termina y se liquida. */
	readonly terminaRonda: boolean;
	/** Los demás jugadores juegan un turno más antes de liquidar (p. ej. al tocar). */
	readonly rondaExtra: boolean;
	/** Puntos que se suman (o restan, si es negativo) al jugador que intentó cerrar. */
	readonly ajustePuntos: number;
}

/** Mano de un jugador que no cerró la ronda, tal como la tenía organizada. */
export interface ManoRival {
	readonly jugadorId: string;
	readonly grupos: ReadonlyArray<ReadonlyArray<Carta>>;
	readonly sobrantes: ReadonlyArray<Carta>;
}

/** Penalizaciones de una ronda: puntos que se suman a cada rival. */
export interface LiquidacionRonda {
	readonly penalizaciones: Readonly<Record<string, number>>;
}

/** Puntaje acumulado por jugador (id del jugador -> puntos). */
export type Marcador = Readonly<Record<string, number>>;

/** Estado de la partida después de liquidar una ronda. */
export interface Desenlace {
	/** La partida terminó. */
	readonly terminada: boolean;
	/** Ganador de la partida, si terminó. */
	readonly ganadorId?: string;
	/** Jugadores que quedan fuera de la partida. */
	readonly eliminados: ReadonlyArray<string>;
}

/**
 * Contrato que implementa cada modalidad de juego.
 */
export interface ReglaJuegoPlugin {
	readonly descriptor: DescriptorRegla;
	configuracionReparto(): ConfiguracionReparto;
	cierresPermitidos(): ReadonlyArray<TipoCierre>;
	validarCierre(mano: ManoDeclarada, tipo: TipoCierre): ResultadoValidacion;
	efectoCierre(resultado: ResultadoValidacion, tipo: TipoCierre): EfectoCierre;
	liquidarRonda(manos: ReadonlyArray<ManoRival>): LiquidacionRonda;
	evaluarDesenlace(marcador: Marcador, cerradorId: string): Desenlace;
}

/** Nombres de las operaciones del contrato (los usa el registro para validar la forma). */
export const OPERACIONES_CONTRATO: ReadonlyArray<keyof ReglaJuegoPlugin> = [
	'configuracionReparto',
	'cierresPermitidos',
	'validarCierre',
	'efectoCierre',
	'liquidarRonda',
	'evaluarDesenlace',
];

/** Atajo para construir un rechazo. */
export function rechazo(motivo: string): ResultadoValidacion {
	return { esValido: false, motivo };
}

/** Atajo para construir una aceptación. */
export const ACEPTADO: ResultadoValidacion = { esValido: true };
