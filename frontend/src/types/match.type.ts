/**
 * Types of the Match aggregate as the backend exposes them (ADR-04/ADR-05).
 * The public view goes to the `partida:{id}` room; the private one (the hand) only to
 * `usuario:{id}`.
 *
 * Property names and literal values are the backend API contract and stay in Spanish
 * (`valor`, `palo`, `jugadores`, `'EN_JUEGO'`…); only the TypeScript names are English.
 */

/** Card ranks of the document model. */
export type CardRank = 'AS' | 'DOS' | 'TRES' | 'CUATRO' | 'CINCO' | 'SEIS' | 'SIETE' | 'OCHO' | 'NUEVE' | 'DIEZ' | 'J' | 'Q' | 'K';

/** Card suits of the document model. */
export type CardSuit = 'TREBOLES' | 'DIAMANTES' | 'CORAZONES' | 'PICAS';

/** A card in the match. `baraja` (deck 1 or 2) tells apart two equal cards when two decks are used. */
export type MatchCard = {
    valor: CardRank;
    palo: CardSuit;
    baraja: number;
};

export type MatchStatus = 'EN_ESPERA' | 'EN_JUEGO' | 'MOSTRANDO_RESULTADOS' | 'FINALIZADA' | 'CANCELADA';
export type MatchPlayerStatus = 'EN_SALA' | 'ACTIVO' | 'ELIMINADO' | 'GANADOR' | 'PERDEDOR';
export type RoundStatus = 'REPARTIENDO' | 'EN_TURNOS' | 'RONDA_EXTRA' | 'LIQUIDANDO' | 'CERRADA';
export type TurnPhase = 'ESPERANDO_ROBO' | 'CON_11_CARTAS';
export type CloseType = 'GANAR_4_3_3' | 'TOCAR';

export type PublicPlayerView = {
    jugadorId: string;
    nombreUsuario: string;
    posicion: number;
    estado: MatchPlayerStatus;
    puntaje: number;
    conectado: boolean;
    /** Only the hand size: opponents' cards never reach the client. */
    cartasEnMano: number;
};

export type PublicRoundView = {
    numero: number;
    estado: RoundStatus;
    turno: { jugadorId: string; fase: TurnPhase; intentoCierre: boolean; numero: number };
    cartasEnMazo: number;
    cartasEnDescarte: number;
    topeDescarte: MatchCard | null;
    rondaExtra: { tocadorId: string; pendientes: string[] } | null;
};

export type ScoreboardEntryView = {
    numeroRonda: number;
    ganadorId: string;
    tipoCierre: CloseType;
    puntos: Array<{ jugadorId: string; puntosRonda: number; acumulado: number; eliminado: boolean }>;
};

/** Public view of the match. */
export type PublicMatchView = {
    partidaId: string;
    version: number;
    estado: MatchStatus;
    modalidad: string;
    ganadorId: string | null;
    pozo: { total: number };
    jugadores: PublicPlayerView[];
    ronda: PublicRoundView | null;
    marcador: ScoreboardEntryView[];
};

/** Private view: the authenticated user's hand. `grupos` are indexes into `cartas`. */
export type PrivateHandView = {
    partidaId: string;
    version: number;
    jugadorId: string;
    cartas: MatchCard[];
    grupos: number[][];
};

/** Domain events that come with the public messages. */
export type MatchEventType =
    | 'PARTIDA_INICIADA'
    | 'CARTA_ROBADA'
    | 'TURNO_CAMBIADO'
    | 'CIERRE_FALLIDO'
    | 'JUGADOR_TOCO'
    | 'RONDA_CERRADA'
    | 'RONDA_INICIADA'
    | 'PARTIDA_FINALIZADA';

/** Message of the public room `partida:{id}`. */
export type PublicMatchMessage = {
    evento: MatchEventType;
    salaId: string;
    jugadorId: string | null;
    detalle: Record<string, unknown>;
    partida: PublicMatchView;
};

/** Message of the private room `usuario:{id}`. */
export type PrivateHandMessage = {
    salaId: string;
    mano: PrivateHandView;
};
