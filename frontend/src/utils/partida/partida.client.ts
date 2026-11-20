/**
 * Cliente de los comandos de la partida (`/api/partidas/actual`).
 *
 * - Genera un `idComando` UUID v4 por intención (el mismo id en un reintento es idempotente).
 * - Envía la `version` del último estado conocido (concurrencia optimista).
 * - Traduce las cartas a índices con la mano de esa misma versión.
 * - Si el backend responde un error de concurrencia (409), relee el estado.
 */
import {BackendUtils} from '../backend.utils.tsx';
import {BackendConstants} from '../constants/backend.constants.ts';
import {CartaPartida} from '../../types/partida.type.ts';
import {
    CerrarRequest,
    DescartarRequest,
    IntencionCerrar,
    IntencionDescartar,
    IntencionRobar,
    PartidaResponse,
    RobarRequest,
} from '../../types/services/partida.ts';
import {IntencionInvalidaError, cuerpoCerrar, cuerpoDescartar, cuerpoRobar, debeRefrescar, generarIdComando} from './partida.utils.ts';

/** Resultado de un comando: el nuevo estado o el código de error controlado. */
export type ResultadoComando =
    | { ok: true; respuesta: PartidaResponse }
    | { ok: false; codigo: string; refrescado?: PartidaResponse };

/** Estado mínimo que el cliente necesita para armar un comando. */
export type EstadoLocal = {
    version: number;
    mano: CartaPartida[];
};

export class PartidaClient {
    /**
     * @param {() => EstadoLocal | undefined} estadoActual Devuelve la versión y la mano que muestra el tablero.
     */
    constructor(private readonly estadoActual: () => EstadoLocal | undefined) {
    }

    /** GET /api/partidas/actual: vista pública + mano del usuario (RF-14, reconexión). */
    async obtenerEstado(): Promise<ResultadoComando> {
        return this.ejecutar((backend) => backend.get<PartidaResponse, never>(BackendConstants.PARTIDA_ESTADO_URL));
    }

    /** Comando robar. */
    async robar(intencion: IntencionRobar): Promise<ResultadoComando> {
        return this.comando((estado, idComando) => {
            const body: RobarRequest = cuerpoRobar(intencion, estado.version, idComando);
            return (backend) => backend.post<PartidaResponse, RobarRequest>(BackendConstants.PARTIDA_ROBAR_URL, body);
        });
    }

    /** Comando descartar. */
    async descartar(intencion: IntencionDescartar): Promise<ResultadoComando> {
        return this.comando((estado, idComando) => {
            const body: DescartarRequest = cuerpoDescartar(estado.mano, intencion, estado.version, idComando);
            return (backend) => backend.post<PartidaResponse, DescartarRequest>(BackendConstants.PARTIDA_DESCARTAR_URL, body);
        });
    }

    /** Comando cerrar (4-3-3 o tocar). */
    async cerrar(intencion: IntencionCerrar): Promise<ResultadoComando> {
        return this.comando((estado, idComando) => {
            const body: CerrarRequest = cuerpoCerrar(estado.mano, intencion, estado.version, idComando);
            return (backend) => backend.post<PartidaResponse, CerrarRequest>(BackendConstants.PARTIDA_CERRAR_URL, body);
        });
    }

    /**
     * Arma el comando con el estado actual. Si la intención no corresponde a la mano, no se
     * envía nada. Si el backend rechaza por concurrencia, se relee el estado.
     */
    private async comando(
        armar: (estado: EstadoLocal, idComando: string) => (backend: BackendUtils) => Promise<PartidaResponse | undefined>,
    ): Promise<ResultadoComando> {
        const estado = this.estadoActual();
        if (!estado) return {ok: false, codigo: 'PARTIDA_NO_ENCONTRADA'};
        let enviar: (backend: BackendUtils) => Promise<PartidaResponse | undefined>;
        try {
            enviar = armar(estado, generarIdComando());
        } catch (e) {
            return {ok: false, codigo: e instanceof IntencionInvalidaError ? e.codigo : 'UNKNOWN_ERROR'};
        }
        const resultado = await this.ejecutar(enviar);
        if (resultado.ok || !debeRefrescar(resultado.codigo)) return resultado;
        const refresco = await this.obtenerEstado();
        return {...resultado, refrescado: refresco.ok ? refresco.respuesta : undefined};
    }

    /** Ejecuta la llamada y captura el código de error controlado del backend. */
    private async ejecutar(llamada: (backend: BackendUtils) => Promise<PartidaResponse | undefined>): Promise<ResultadoComando> {
        let codigo = 'UNKNOWN_ERROR';
        const backend = new BackendUtils((mensaje: string) => {
            codigo = mensaje;
        });
        const respuesta = await llamada(backend);
        return respuesta ? {ok: true, respuesta} : {ok: false, codigo};
    }
}
