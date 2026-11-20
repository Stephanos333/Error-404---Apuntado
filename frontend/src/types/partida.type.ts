/**
 * Tipos del agregado Partida tal como los expone el backend (ADR-04/ADR-05).
 * La vista pública llega a la sala `partida:{id}`; la privada (la mano) solo a `usuario:{id}`.
 */

/** Valores de carta del modelo documental. */
export type ValorCarta = 'AS' | 'DOS' | 'TRES' | 'CUATRO' | 'CINCO' | 'SEIS' | 'SIETE' | 'OCHO' | 'NUEVE' | 'DIEZ' | 'J' | 'Q' | 'K';

/** Palos del modelo documental. */
export type PaloCarta = 'TREBOLES' | 'DIAMANTES' | 'CORAZONES' | 'PICAS';

/** Carta de la partida. `baraja` (1 o 2) distingue dos cartas iguales con doble baraja. */
export type CartaPartida = {
    valor: ValorCarta;
    palo: PaloCarta;
    baraja: number;
};

export type EstadoPartida = 'EN_ESPERA' | 'EN_JUEGO' | 'MOSTRANDO_RESULTADOS' | 'FINALIZADA' | 'CANCELADA';
export type EstadoJugadorPartida = 'EN_SALA' | 'ACTIVO' | 'ELIMINADO' | 'GANADOR' | 'PERDEDOR';
export type EstadoRonda = 'REPARTIENDO' | 'EN_TURNOS' | 'RONDA_EXTRA' | 'LIQUIDANDO' | 'CERRADA';
export type FaseTurno = 'ESPERANDO_ROBO' | 'CON_11_CARTAS';
export type TipoCierre = 'GANAR_4_3_3' | 'TOCAR';

export type JugadorVistaPublica = {
    jugadorId: string;
    nombreUsuario: string;
    posicion: number;
    estado: EstadoJugadorPartida;
    puntaje: number;
    conectado: boolean;
    /** Solo el tamaño de la mano: las cartas de los rivales nunca llegan al cliente. */
    cartasEnMano: number;
};

export type RondaVistaPublica = {
    numero: number;
    estado: EstadoRonda;
    turno: { jugadorId: string; fase: FaseTurno; intentoCierre: boolean; numero: number };
    cartasEnMazo: number;
    cartasEnDescarte: number;
    topeDescarte: CartaPartida | null;
    rondaExtra: { tocadorId: string; pendientes: string[] } | null;
};

export type EntradaMarcadorVista = {
    numeroRonda: number;
    ganadorId: string;
    tipoCierre: TipoCierre;
    puntos: Array<{ jugadorId: string; puntosRonda: number; acumulado: number; eliminado: boolean }>;
};

/** Vista pública de la partida. */
export type VistaPublicaPartida = {
    partidaId: string;
    version: number;
    estado: EstadoPartida;
    modalidad: string;
    ganadorId: string | null;
    pozo: { total: number };
    jugadores: JugadorVistaPublica[];
    ronda: RondaVistaPublica | null;
    marcador: EntradaMarcadorVista[];
};

/** Vista privada: la mano del usuario autenticado. `grupos` son índices de `cartas`. */
export type VistaPrivadaPartida = {
    partidaId: string;
    version: number;
    jugadorId: string;
    cartas: CartaPartida[];
    grupos: number[][];
};

/** Eventos de dominio que acompañan a los mensajes públicos. */
export type TipoEventoPartida =
    | 'PARTIDA_INICIADA'
    | 'CARTA_ROBADA'
    | 'TURNO_CAMBIADO'
    | 'CIERRE_FALLIDO'
    | 'JUGADOR_TOCO'
    | 'RONDA_CERRADA'
    | 'RONDA_INICIADA'
    | 'PARTIDA_FINALIZADA';

/** Mensaje de la sala pública `partida:{id}`. */
export type MensajePublicoPartida = {
    evento: TipoEventoPartida;
    salaId: string;
    jugadorId: string | null;
    detalle: Record<string, unknown>;
    partida: VistaPublicaPartida;
};

/** Mensaje de la sala privada `usuario:{id}`. */
export type MensajePrivadoPartida = {
    salaId: string;
    mano: VistaPrivadaPartida;
};
