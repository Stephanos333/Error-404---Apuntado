/**
 * Nombres de las salas de Socket.IO (ADR-05, R04).
 *
 * - `partida:{salaId}`: sala PÚBLICA de la mesa. Recibe solo la vista pública.
 * - `usuario:{userId}`: sala PRIVADA de un usuario. Recibe solo su mano.
 *
 * `salaId` es el id del juego (sala de espera), estable antes y durante la partida.
 */
export const PREFIJO_SALA_PUBLICA = 'partida:';
export const PREFIJO_SALA_PRIVADA = 'usuario:';

/** Sala pública de la mesa. */
export const salaPublica = (salaId: string): string => `${PREFIJO_SALA_PUBLICA}${salaId}`;

/** Sala privada de un usuario. */
export const salaPrivada = (userId: string): string => `${PREFIJO_SALA_PRIVADA}${userId}`;
