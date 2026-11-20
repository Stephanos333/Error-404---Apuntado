/**
 * Agregado Partida (ADR-04): unidad de consistencia de todo el estado de juego.
 *
 * Estas interfaces siguen la forma de `docs/schemas/partidas.schema.json`. Los
 * identificadores de MongoDB (`_id`, `usuarioId`, `anfitrionId`, `asientoId`) se manejan
 * como cadenas hexadecimales en el dominio; la capa de aplicación los convierte a
 * `ObjectId` al persistir.
 *
 * `jugadorId` es el `userId` (UUID) del usuario: así el servidor identifica a quien actúa
 * a partir del JWT sin consultas adicionales.
 */

/** Valores de carta del esquema documental. */
export const VALORES_CARTA = ['AS', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'J', 'Q', 'K'] as const;
export type ValorCarta = (typeof VALORES_CARTA)[number];

/** Palos del esquema documental. */
export const PALOS_CARTA = ['TREBOLES', 'DIAMANTES', 'CORAZONES', 'PICAS'] as const;
export type PaloCarta = (typeof PALOS_CARTA)[number];

/** Carta embebida en la partida. `baraja` es 1 o 2 (doble baraja). */
export interface CartaPartida {
	valor: ValorCarta;
	palo: PaloCarta;
	baraja: number;
}

export type EstadoPartida = 'EN_ESPERA' | 'EN_JUEGO' | 'MOSTRANDO_RESULTADOS' | 'FINALIZADA' | 'CANCELADA';
export type EstadoJugadorPartida = 'EN_SALA' | 'ACTIVO' | 'ELIMINADO' | 'GANADOR' | 'PERDEDOR';
export type EstadoRonda = 'REPARTIENDO' | 'EN_TURNOS' | 'RONDA_EXTRA' | 'LIQUIDANDO' | 'CERRADA';
export type FaseTurno = 'ESPERANDO_ROBO' | 'CON_11_CARTAS';
export type OrigenRobo = 'MAZO' | 'DESCARTE';

export interface JugadorPartida {
	jugadorId: string;
	usuarioId: string;
	nombreUsuario: string;
	posicion: number;
	estado: EstadoJugadorPartida;
	puntaje: number;
	usoReenganche: boolean;
	conectado: boolean;
	desconectadoDesde: Date | null;
}

export interface AportePozo {
	usuarioId: string;
	tipo: 'APUESTA' | 'REENGANCHE';
	monto: number;
	asientoId: string;
}

export interface PozoPartida {
	total: number;
	aportes: AportePozo[];
}

export interface TurnoPartida {
	jugadorId: string;
	fase: FaseTurno;
	intentoCierre: boolean;
	numero: number;
}

export interface ManoJugador {
	jugadorId: string;
	cartas: CartaPartida[];
	/** Organización del jugador: índices de `cartas` por grupo. Define la liquidación (RD-24). */
	grupos: number[][];
}

export interface RondaPartida {
	numero: number;
	estado: EstadoRonda;
	posicionInicial: number;
	turno: TurnoPartida;
	mazo: CartaPartida[];
	pozoDescarte: CartaPartida[];
	manos: ManoJugador[];
	rondaExtra: null;
}

export interface PuntosRonda {
	jugadorId: string;
	puntosRonda: number;
	castigos: number;
	acumulado: number;
	eliminado: boolean;
	reenganchado: boolean;
}

export interface EntradaMarcador {
	numeroRonda: number;
	ganadorId: string;
	tipoCierre: 'GANAR_4_3_3' | 'TOCAR';
	puntos: PuntosRonda[];
	cerradaEn: Date;
}

/** Copia congelada de los parámetros del sistema al crear la partida (RD-36). */
export interface ParametrosPartida {
	limiteEliminacion: number;
	umbralTocar: number;
	castigoCierreInvalido: number;
	bonificacionCierre: number;
	umbralVictoriaNegativa: number;
	valorComodin: number;
	comodinesPorBaraja: number;
	jugadoresDobleBaraja: number;
	graciaDesconexionSeg: number;
	ventanaResultadosSeg: number;
}

export interface ConfiguracionPartida {
	modalidad: string;
	plugin: { id: string; version: string };
	cupo: number;
	apuestaPorJugador: number;
	visibilidad: 'PUBLICA' | 'PRIVADA';
	tipoEscalera: 'CON_VUELTA' | 'SIN_VUELTA';
	comodinesActivos: boolean;
	reengancheActivo: boolean;
	victoriaNegativaActiva: boolean;
	parametros: ParametrosPartida;
}

export interface Partida {
	_id: string;
	codigoInvitacion: string;
	nombre: string;
	estado: EstadoPartida;
	anfitrionId: string;
	configuracion: ConfiguracionPartida;
	jugadores: JugadorPartida[];
	pozo: PozoPartida;
	rondaActual: RondaPartida | null;
	marcador: EntradaMarcador[];
	ganadorId: string | null;
	ventanaHasta: Date | null;
	/** idComando de las últimas acciones aplicadas (idempotencia, máximo 20). */
	comandosRecientes: string[];
	/** Control de concurrencia optimista. */
	version: number;
	creadaEn: Date;
	actualizadaEn: Date;
	finalizadaEn: Date | null;
}

/** Cantidad de comandos recientes que se conservan para la idempotencia. */
export const MAXIMO_COMANDOS_RECIENTES = 20;
