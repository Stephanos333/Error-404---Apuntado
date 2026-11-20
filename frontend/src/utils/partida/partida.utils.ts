/**
 * Lógica pura del tablero de la partida (sin React ni red): identificación de cartas,
 * traducción de cartas a índices para el backend, validación de la forma del cierre y
 * versiones.
 */
import {CartaPartida, PaloCarta, TipoCierre, ValorCarta} from '../../types/partida.type.ts';
import {CerrarRequest, DescartarRequest, IntencionCerrar, IntencionDescartar, IntencionRobar, RobarRequest} from '../../types/services/partida.ts';

/** Clave única de una carta dentro de una mano (con doble baraja hay cartas repetidas). */
export const claveCarta = (c: CartaPartida): string => `${c.valor}-${c.palo}-${c.baraja}`;

/** Igualdad de cartas. */
export const mismaCarta = (a: CartaPartida, b: CartaPartida): boolean => claveCarta(a) === claveCarta(b);

/**
 * Genera un `idComando` UUID v4. Usa `crypto.randomUUID` cuando existe (contextos seguros)
 * y, si no, `crypto.getRandomValues` (también criptográfico).
 */
export function generarIdComando(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Error de traducción: la intención no corresponde a la mano actual. */
export class IntencionInvalidaError extends Error {
    constructor(public readonly codigo: string) {
        super(codigo);
    }
}

/**
 * Índice de una carta en la mano.
 * @throws {IntencionInvalidaError} CARTA_NO_ESTA_EN_LA_MANO
 */
export function indiceDe(mano: CartaPartida[], carta: CartaPartida): number {
    const i = mano.findIndex((c) => mismaCarta(c, carta));
    if (i < 0) throw new IntencionInvalidaError('CARTA_NO_ESTA_EN_LA_MANO');
    return i;
}

/** Traduce grupos de cartas a grupos de índices de la mano. */
export const gruposAIndices = (mano: CartaPartida[], grupos: CartaPartida[][]): number[][] =>
    grupos.filter((g) => g.length > 0).map((g) => g.map((c) => indiceDe(mano, c)));

/** Traduce grupos de índices (como los guarda el backend) a grupos de cartas. */
export const gruposACartas = (mano: CartaPartida[], grupos: number[][]): CartaPartida[][] =>
    grupos.map((g) => g.map((i) => mano[i]).filter((c): c is CartaPartida => !!c)).filter((g) => g.length > 0);

/**
 * Organización de la mano tras recibir una mano nueva. Sin organización local (carga
 * inicial o ronda nueva) se usa la que guardó el servidor; si no, se conserva la local
 * quitando las cartas que ya no están en la mano.
 */
export function reconciliarGrupos(local: CartaPartida[][] | null, cartas: CartaPartida[], gruposServidor: number[][]): CartaPartida[][] {
    if (!local) return gruposACartas(cartas, gruposServidor);
    const enMano = new Set(cartas.map(claveCarta));
    return local.map((g) => g.filter((c) => enMano.has(claveCarta(c)))).filter((g) => g.length > 0);
}

/** Cartas de la mano que no están en ningún grupo ni son la carta indicada. */
export function sobrantesDe(mano: CartaPartida[], grupos: CartaPartida[][], excluida?: CartaPartida): CartaPartida[] {
    const usadas = new Set(grupos.flat().map(claveCarta));
    if (excluida) usadas.add(claveCarta(excluida));
    return mano.filter((c) => !usadas.has(claveCarta(c)));
}

/** Cuerpo de `robar`. */
export function cuerpoRobar(intencion: IntencionRobar, version: number, idComando: string): RobarRequest {
    return {origen: intencion.fuente === 'POZO_DESCARTE' ? 'DESCARTE' : 'MAZO', version, idComando};
}

/** Cuerpo de `descartar`: la carta y los grupos se traducen a índices de la mano actual. */
export function cuerpoDescartar(mano: CartaPartida[], intencion: IntencionDescartar, version: number, idComando: string): DescartarRequest {
    const carta = indiceDe(mano, intencion.carta);
    const grupos = intencion.grupos ? gruposAIndices(mano, intencion.grupos) : undefined;
    if (grupos?.flat().includes(carta)) throw new IntencionInvalidaError('GRUPOS_INVALIDOS');
    return {carta, grupos, version, idComando};
}

/**
 * Cuerpo de `cerrar`. Verifica que la declaración sea coherente con la mano: los grupos,
 * el descarte y las sobrantes deben cubrir exactamente las 11 cartas, sin repetir.
 * @throws {IntencionInvalidaError} GRUPOS_INVALIDOS
 */
export function cuerpoCerrar(mano: CartaPartida[], intencion: IntencionCerrar, version: number, idComando: string): CerrarRequest {
    const {grupos, descarte, cartasSobrantes} = intencion.declaracion;
    const declaradas = [...grupos.flat(), descarte, ...cartasSobrantes].map(claveCarta);
    const coincide = declaradas.length === mano.length && new Set(declaradas).size === mano.length && mano.every((c) => declaradas.includes(claveCarta(c)));
    if (!coincide) throw new IntencionInvalidaError('GRUPOS_INVALIDOS');
    return {tipo: intencion.tipoCierre, grupos: gruposAIndices(mano, grupos), descarte: indiceDe(mano, descarte), version, idComando};
}

/**
 * Forma del cierre según los tamaños de los grupos (la validez de las combinaciones la
 * decide el servidor): 1 cuarta + 2 ternas sin sobrantes es 4-3-3; 3 ternas + 1 sobrante
 * es tocar. `null` si la organización no tiene ninguna de las dos formas.
 */
export function formaDelCierre(grupos: CartaPartida[][], sobrantes: CartaPartida[]): TipoCierre | null {
    const tamanos = grupos.filter((g) => g.length > 0).map((g) => g.length).sort().join(',');
    if (tamanos === '3,3,4' && sobrantes.length === 0) return 'GANAR_4_3_3';
    if (tamanos === '3,3,3' && sobrantes.length === 1) return 'TOCAR';
    return null;
}

/** Puntos de una carta (misma tabla que el backend: A, J, Q y K valen 10). */
const PUNTOS: Record<ValorCarta, number> = {
    AS: 10, DOS: 2, TRES: 3, CUATRO: 4, CINCO: 5, SEIS: 6, SIETE: 7, OCHO: 8, NUEVE: 9, DIEZ: 10, J: 10, Q: 10, K: 10,
};

/** Suma de puntos de unas cartas (informativo: el servidor decide). */
export const puntos = (cartas: CartaPartida[]): number => cartas.reduce((s, c) => s + PUNTOS[c.valor], 0);

/** Código de imagen del tipo de carta (`public/assets/images/card/<diseño>/<palo>-<tipo>.png`). */
const TIPO_IMAGEN: Record<ValorCarta, string> = {
    AS: 'A', DOS: 'C2', TRES: 'C3', CUATRO: 'C4', CINCO: 'C5', SEIS: 'C6', SIETE: 'C7', OCHO: 'C8', NUEVE: 'C9', DIEZ: 'C10', J: 'J', Q: 'Q', K: 'K',
};

/** Código de imagen del palo. */
const PALO_IMAGEN: Record<PaloCarta, string> = {TREBOLES: 'CLUB', DIAMANTES: 'DIAMOND', CORAZONES: 'HEART', PICAS: 'SPADE'};

/** Datos para `CardComponent` a partir de una carta de la partida. */
export const imagenDe = (c: CartaPartida): { suit: string; type: string } => ({suit: PALO_IMAGEN[c.palo], type: TIPO_IMAGEN[c.valor]});

/** Errores del backend tras los cuales el estado local quedó desactualizado y hay que releerlo. */
const ERRORES_QUE_REFRESCAN = new Set(['VERSION_DESACTUALIZADA', 'RONDA_YA_CERRADA', 'TURNO_NO_CORRESPONDE', 'FASE_DE_TURNO_INVALIDA']);

/** Indica si, tras el error, hay que pedir `GET /api/partidas/actual`. */
export const debeRefrescar = (codigo: string): boolean => ERRORES_QUE_REFRESCAN.has(codigo);

/**
 * Decide si un estado recibido (por socket o por respuesta) reemplaza al actual:
 * nunca se retrocede a una versión anterior. Si hay un salto de versión, hay que releer.
 */
export function compararVersion(actual: number | undefined, recibida: number): 'APLICAR' | 'IGNORAR' | 'REFRESCAR' {
    if (actual === undefined || recibida === actual + 1 || recibida === actual) return 'APLICAR';
    if (recibida < actual) return 'IGNORAR';
    return 'REFRESCAR';
}
