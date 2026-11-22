import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Socket} from 'socket.io-client';
import {MensajePrivadoPartida, MensajePublicoPartida, VistaPrivadaPartida, VistaPublicaPartida} from '../../types/partida.type.ts';
import {PartidaResponse} from '../../types/services/partida.ts';
import {MENSAJES_PUBLICOS_PARTIDA, SocketConstants} from '../../utils/constants/socket.constants.ts';
import {PartidaClient, ResultadoComando} from '../../utils/partida/partida.client.ts';
import {compararVersion} from '../../utils/partida/partida.utils.ts';

/** Estado de la partida que consume el tablero. */
export type PartidaEnVivo = {
    partida: VistaPublicaPartida | undefined;
    /** `undefined` mientras carga; `null` si el usuario no tiene mano (eliminado). */
    mano: VistaPrivadaPartida | null | undefined;
    cliente: PartidaClient;
    /** Aplica la respuesta de un comando (o el estado releído tras un error de concurrencia). */
    aplicarResultado: (resultado: ResultadoComando) => void;
};

/**
 * Mantiene la vista pública y la mano del usuario sincronizadas con el backend.
 *
 * - Carga inicial y reconexión: `GET /api/partidas/actual`.
 * - Tiempo real: al conectar emite `GAME_CONNECTION_EVENT`; el backend une el socket a la
 *   sala pública `partida:{gameId}` y a la privada `usuario:{userId}`.
 * - Versiones: nunca se retrocede. Un mensaje del socket con salto de versión (se perdió
 *   alguno) provoca una relectura completa.
 * @param {Socket | undefined} socket El socket del namespace `game`.
 * @param {(mensaje: MensajePublicoPartida) => void} alMensaje Se llama con cada mensaje público aplicado.
 */
export function usePartida(socket: Socket | undefined, alMensaje: (mensaje: MensajePublicoPartida) => void): PartidaEnVivo {
    const [partida, setPartida] = useState<VistaPublicaPartida | undefined>();
    const [mano, setMano] = useState<VistaPrivadaPartida | null | undefined>();
    const partidaRef = useRef<VistaPublicaPartida | undefined>();
    const manoRef = useRef<VistaPrivadaPartida | null | undefined>();
    const alMensajeRef = useRef(alMensaje);
    alMensajeRef.current = alMensaje;

    const cliente = useMemo(() => new PartidaClient(() => {
        const p = partidaRef.current;
        const m = manoRef.current;
        return p && m ? {version: p.version, mano: m.cartas} : undefined;
    }), []);

    const ponerPartida = useCallback((nueva: VistaPublicaPartida): void => {
        partidaRef.current = nueva;
        setPartida(nueva);
    }, []);

    const ponerMano = useCallback((nueva: VistaPrivadaPartida | null): void => {
        const actual = manoRef.current;
        if (nueva && actual && nueva.version < actual.version) return;
        manoRef.current = nueva;
        setMano(nueva);
    }, []);

    /** Respuesta HTTP (comando o relectura): es autoritativa si no es más vieja que lo mostrado. */
    const aplicarRespuesta = useCallback((respuesta: PartidaResponse): void => {
        const actual = partidaRef.current?.version;
        if (actual !== undefined && respuesta.partida.version < actual) return;
        ponerPartida(respuesta.partida);
        ponerMano(respuesta.mano);
    }, [ponerPartida, ponerMano]);

    const refrescar = useCallback(async (): Promise<void> => {
        const resultado = await cliente.obtenerEstado();
        if (resultado.ok) aplicarRespuesta(resultado.respuesta);
    }, [cliente, aplicarRespuesta]);

    const aplicarResultado = useCallback((resultado: ResultadoComando): void => {
        if (resultado.ok) aplicarRespuesta(resultado.respuesta);
        else if (resultado.refrescado) aplicarRespuesta(resultado.refrescado);
    }, [aplicarRespuesta]);

    useEffect(() => {
        refrescar().then();
    }, [refrescar]);

    useEffect(() => {
        if (!socket) return;
        const alConectar = (): void => {
            socket.emit(SocketConstants.GAME_CONNECTION_EVENT);
            // Tras una reconexión pudieron perderse mensajes: se relee el estado completo.
            refrescar().then();
        };
        const alPublico = (mensaje: MensajePublicoPartida): void => {
            const decision = compararVersion(partidaRef.current?.version, mensaje.partida.version);
            if (decision === 'IGNORAR') return;
            if (decision === 'REFRESCAR') {
                refrescar().then();
                return;
            }
            ponerPartida(mensaje.partida);
            alMensajeRef.current(mensaje);
        };
        const alPrivado = (mensaje: MensajePrivadoPartida): void => ponerMano(mensaje.mano);

        if (socket.connected) socket.emit(SocketConstants.GAME_CONNECTION_EVENT);
        socket.on('connect', alConectar);
        MENSAJES_PUBLICOS_PARTIDA.forEach((nombre) => socket.on(nombre, alPublico));
        socket.on(SocketConstants.PRIVATE_HAND_LISTENER, alPrivado);
        return () => {
            socket.off('connect', alConectar);
            MENSAJES_PUBLICOS_PARTIDA.forEach((nombre) => socket.off(nombre, alPublico));
            socket.off(SocketConstants.PRIVATE_HAND_LISTENER, alPrivado);
        };
    }, [socket, refrescar, ponerPartida, ponerMano]);

    return {partida, mano, cliente, aplicarResultado};
}
