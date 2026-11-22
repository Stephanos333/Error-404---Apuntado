import {CartaPartida, TipoCierre, VistaPrivadaPartida, VistaPublicaPartida} from '../partida.type.ts';

/**
 * Servicios de la partida (`/api/partidas/actual`). Todos los comandos llevan `version`
 * (concurrencia optimista) e `idComando` (idempotencia, UUID v4).
 */

/** Respuesta común del estado y de los comandos. */
export type PartidaResponse = {
    success: boolean;
    /** `false` si el comando ya se había aplicado (reenvío idempotente). */
    aplicado: boolean;
    partida: VistaPublicaPartida;
    mano: VistaPrivadaPartida | null;
};

/** Datos de concurrencia de todo comando. */
export type ComandoBase = {
    version: number;
    idComando: string;
};

// ---- Intenciones del jugador (lo que arma la interfaz) ------------------------------

/** Robar del mazo o del tope del pozo de descarte. */
export type IntencionRobar = {
    fuente: 'MAZO' | 'POZO_DESCARTE';
};

/** Descartar una carta, enviando la organización actual de la mano. */
export type IntencionDescartar = {
    carta: CartaPartida;
    grupos?: CartaPartida[][];
};

/** Declarar un cierre: grupos, carta de descarte y cartas sobrantes. */
export type IntencionCerrar = {
    tipoCierre: TipoCierre;
    declaracion: {
        grupos: CartaPartida[][];
        descarte: CartaPartida;
        cartasSobrantes: CartaPartida[];
    };
};

// ---- Cuerpos que recibe el backend (contrato REST de la fase 2) ---------------------
// El backend identifica las cartas por su índice en la mano que él mismo envió: el
// cliente traduce las cartas a índices con la mano de la misma versión.

/** POST /api/partidas/actual/comandos/robar */
export type RobarRequest = ComandoBase & {
    origen: 'MAZO' | 'DESCARTE';
};

/** POST /api/partidas/actual/comandos/descartar */
export type DescartarRequest = ComandoBase & {
    carta: number;
    grupos?: number[][];
};

/** POST /api/partidas/actual/comandos/cerrar */
export type CerrarRequest = ComandoBase & {
    tipo: TipoCierre;
    grupos: number[][];
    descarte: number;
};
