import './game-board.component.css';
import {JSX, useEffect, useRef, useState} from 'react';
import {Button} from '@mui/material';
import {CardComponent} from '../../../../components/card/card.component.tsx';
import {LocalLoadingComponent} from '../../../../components/loading/local/local-loading.component.tsx';
import {GlobalLoadingComponent} from '../../../../components/loading/global/global-loading.component.tsx';
import {AlertTypeConstants} from '../../../../utils/constants/alert.constants.ts';
import {CartaPartida, VistaPrivadaPartida, VistaPublicaPartida} from '../../../../types/partida.type.ts';
import {IntencionRobar} from '../../../../types/services/partida.ts';
import {PartidaClient, ResultadoComando} from '../../../../utils/partida/partida.client.ts';
import {claveCarta, formaDelCierre, imagenDe, puntos, reconciliarGrupos, sobrantesDe} from '../../../../utils/partida/partida.utils.ts';
import CardDeckImage from '../../../../../public/assets/images/game/card-deck.jpg';
import DiscardedCardsImage from '../../../../../public/assets/images/game/discarded-cards.jpg';
import EmptyDiscardedCardsImage from '../../../../../public/assets/images/game/empty-discarded-cards.jpg';

/** Máximo de grupos que acepta el backend en la organización de la mano. */
const MAXIMO_GRUPOS = 4;
/** Tamaño máximo de un grupo (una cuarta). */
const MAXIMO_CARTAS_GRUPO = 4;

/**
 * Tablero de la partida: mazo, pozo de descarte, la mano organizada en grupos y las
 * acciones del turno (robar, descartar y cerrar según la modalidad).
 *
 * La organización de la mano es local hasta que se envía con `descartar` o `cerrar`.
 * Las reglas las decide el servidor: aquí solo se valida la forma para dar mensajes claros.
 * @param props Los parámetros del tablero.
 * @param props.partida La vista pública de la partida.
 * @param props.mano La mano del usuario (`null` si fue eliminado).
 * @param props.miId El id del usuario autenticado.
 * @param props.diseno El diseño de cartas del usuario.
 * @param props.cliente El cliente de comandos de la partida.
 * @param props.aplicarResultado Aplica al estado la respuesta de un comando.
 * @param props.mostrarAlerta Muestra un mensaje al usuario.
 * @constructor
 */
export function GameBoardComponent(props: {
    partida: VistaPublicaPartida | undefined,
    mano: VistaPrivadaPartida | null | undefined,
    miId: string | null,
    diseno: string,
    cliente: PartidaClient,
    aplicarResultado: (resultado: ResultadoComando) => void,
    mostrarAlerta: (tipo: AlertTypeConstants, codigo: string) => void,
}): JSX.Element {
    const {partida, mano, mostrarAlerta} = props;

    /**
     * Organización local de la mano y cartas seleccionadas (por su clave).
     */
    const [grupos, setGrupos] = useState<CartaPartida[][] | null>(null);
    const [seleccion, setSeleccion] = useState<string[]>([]);
    const [enviando, setEnviando] = useState<boolean>(false);
    const rondaDeLosGrupos = useRef<number | undefined>();
    const numeroRonda: number | undefined = partida?.ronda?.numero;

    /**
     * Al llegar una mano nueva se conserva la organización local (sin las cartas que ya no
     * están). En una ronda nueva se toma la organización del servidor.
     */
    useEffect(() => {
        if (!mano) {
            setGrupos(null);
            setSeleccion([]);
            return;
        }
        const mismaRonda = rondaDeLosGrupos.current === numeroRonda;
        rondaDeLosGrupos.current = numeroRonda;
        setGrupos((previos) => reconciliarGrupos(mismaRonda ? previos : null, mano.cartas, mano.grupos));
        const enMano = new Set(mano.cartas.map(claveCarta));
        setSeleccion((previa) => previa.filter((k) => enMano.has(k)));
    }, [mano, numeroRonda]);

    const ronda = partida?.ronda ?? null;
    const cartas: CartaPartida[] = mano?.cartas ?? [];
    const gruposActuales: CartaPartida[][] = grupos ?? [];
    const sueltas: CartaPartida[] = sobrantesDe(cartas, gruposActuales);
    const seleccionadas: CartaPartida[] = sueltas.filter((c) => seleccion.includes(claveCarta(c)));
    const rondaJugable = partida?.estado === 'EN_JUEGO' && (ronda?.estado === 'EN_TURNOS' || ronda?.estado === 'RONDA_EXTRA');
    const miTurno = !!mano && rondaJugable && ronda?.turno.jugadorId === props.miId;
    const puedeRobar = miTurno && ronda?.turno.fase === 'ESPERANDO_ROBO';
    const conOnceCartas = miTurno && ronda?.turno.fase === 'CON_11_CARTAS';
    const esApuntado = partida?.modalidad === 'apuntado';
    const nombreDe = (jugadorId: string): string =>
        partida?.jugadores.find((j) => j.jugadorId === jugadorId)?.nombreUsuario ?? 'otro jugador';

    /**
     * Envía un comando, aplica el estado resultante y muestra el error controlado, si lo hay.
     */
    const ejecutar = async (comando: () => Promise<ResultadoComando>): Promise<boolean> => {
        setEnviando(true);
        const resultado = await comando();
        props.aplicarResultado(resultado);
        if (!resultado.ok) mostrarAlerta(AlertTypeConstants.ERROR_ALERT, resultado.codigo);
        setEnviando(false);
        return resultado.ok;
    };

    const robar = async (fuente: IntencionRobar['fuente']): Promise<void> => {
        if (!puedeRobar || enviando) return;
        if (fuente === 'POZO_DESCARTE' && !ronda?.topeDescarte) {
            mostrarAlerta(AlertTypeConstants.WARNING_ALERT, 'POZO_DESCARTE_VACIO');
            return;
        }
        await ejecutar(() => props.cliente.robar({fuente}));
    };

    const alternarSeleccion = (carta: CartaPartida): void => {
        const clave = claveCarta(carta);
        setSeleccion((previa) => previa.includes(clave) ? previa.filter((k) => k !== clave) : [...previa, clave]);
    };

    const formarGrupo = (): void => {
        if (seleccionadas.length < 1 || seleccionadas.length > MAXIMO_CARTAS_GRUPO) {
            mostrarAlerta(AlertTypeConstants.WARNING_ALERT, 'SELECCIONA_CARTAS_GRUPO_MESSAGE');
            return;
        }
        if (gruposActuales.length >= MAXIMO_GRUPOS) {
            mostrarAlerta(AlertTypeConstants.WARNING_ALERT, 'MAXIMO_GRUPOS_MESSAGE');
            return;
        }
        setGrupos([...gruposActuales, seleccionadas]);
        setSeleccion([]);
    };

    const soltarGrupo = (indice: number): void => {
        setGrupos(gruposActuales.filter((_, i) => i !== indice));
    };

    const descartar = async (): Promise<void> => {
        if (!conOnceCartas || enviando) return;
        if (seleccionadas.length !== 1) {
            mostrarAlerta(AlertTypeConstants.WARNING_ALERT, 'SELECCIONA_UNA_CARTA_MESSAGE');
            return;
        }
        const ok = await ejecutar(() => props.cliente.descartar({carta: seleccionadas[0], grupos: gruposActuales}));
        if (ok) setSeleccion([]);
    };

    /**
     * Cierre: la carta seleccionada es el descarte; las demás sueltas son las sobrantes.
     * La forma (4-3-3 o tocar) se deduce de los grupos; la validez la decide el servidor.
     */
    const cerrar = async (): Promise<void> => {
        if (!conOnceCartas || enviando) return;
        const mensajeForma = esApuntado ? 'FORMA_APUNTADO_MESSAGE' : 'FORMA_4_3_3_MESSAGE';
        if (seleccionadas.length !== 1) {
            mostrarAlerta(AlertTypeConstants.WARNING_ALERT, mensajeForma);
            return;
        }
        const descarte = seleccionadas[0];
        const cartasSobrantes = sobrantesDe(cartas, gruposActuales, descarte);
        const tipoCierre = formaDelCierre(gruposActuales, cartasSobrantes);
        if (!tipoCierre || (!esApuntado && tipoCierre !== 'GANAR_4_3_3')) {
            mostrarAlerta(AlertTypeConstants.WARNING_ALERT, mensajeForma);
            return;
        }
        const ok = await ejecutar(() => props.cliente.cerrar({
            tipoCierre,
            declaracion: {grupos: gruposActuales, descarte, cartasSobrantes},
        }));
        if (ok) setSeleccion([]);
    };

    /**
     * Texto de estado del turno.
     */
    const estadoTurno = (): string => {
        if (!partida || !ronda) return 'Esperando el estado de la partida...';
        if (!mano) return 'Fuiste eliminado: observas la partida.';
        if (!rondaJugable) return 'Liquidando la ronda...';
        if (!miTurno) return `Turno de ${nombreDe(ronda.turno.jugadorId)}.`;
        if (puedeRobar) return 'Tu turno: roba del mazo o del pozo de descarte.';
        return 'Tu turno: organiza tus grupos y descarta una carta o cierra.';
    };

    const rondaExtra = ronda?.rondaExtra;
    const tope = ronda?.topeDescarte ?? null;

    /** Pinta una carta de la mano. */
    const carta = (c: CartaPartida, seleccionable: boolean): JSX.Element => {
        const {suit, type} = imagenDe(c);
        const seleccionada = seleccion.includes(claveCarta(c));
        return (
            <CardComponent
                key={claveCarta(c)}
                designName={props.diseno}
                suit={suit}
                type={type}
                onClick={seleccionable ? () => alternarSeleccion(c) : undefined}
                positionClassName={`game-board-card ${seleccionada ? 'game-board-card-selected' : ''}`}
            />
        );
    };

    return (
        <>
            <div id='game-board-component-container' className='component-container'>
                <div id='game-board-maze-container'>
                    <div id='game-board-card-deck-container'>
                        <img
                            onClick={() => robar('MAZO')}
                            className={`game-board-maze-container-item ${puedeRobar ? 'game-element-available' : ''}`}
                            id='game-board-card-deck'
                            alt='Mazo'
                            src={CardDeckImage}
                        />
                        <p>Mazo: {ronda?.cartasEnMazo ?? 0} cartas</p>
                    </div>
                    <div id='game-board-discarded-cards-container'>
                        <img
                            onClick={() => robar('POZO_DESCARTE')}
                            className={`game-board-maze-container-item ${puedeRobar && tope ? 'game-element-available' : ''}`}
                            id='game-board-discarded-cards-image'
                            alt='Pozo de descarte'
                            src={tope ? DiscardedCardsImage : EmptyDiscardedCardsImage}
                        />
                        {
                            tope
                                ? <CardComponent
                                    onClick={() => robar('POZO_DESCARTE')}
                                    designName={props.diseno}
                                    suit={imagenDe(tope).suit}
                                    type={imagenDe(tope).type}
                                    positionClassName='discarded-cards-card'
                                />
                                : <></>
                        }
                    </div>
                </div>
                <div id='game-board-cards-container'>
                    <div id='game-board-status'>
                        <h3>{estadoTurno()}</h3>
                        {
                            partida && ronda
                                ? <p>
                                    {esApuntado ? 'Apuntado' : 'Clásica'} · Ronda {ronda.numero} · Pozo: {partida.pozo.total} tokens
                                </p>
                                : <></>
                        }
                        {
                            rondaExtra
                                ? <p className='game-board-status-extra'>
                                    Ronda extra: {nombreDe(rondaExtra.tocadorId)} tocó.
                                    {rondaExtra.pendientes.length > 0 ? ` Falta: ${rondaExtra.pendientes.map(nombreDe).join(', ')}.` : ''}
                                </p>
                                : <></>
                        }
                    </div>
                    {
                        mano === undefined
                            ? <LocalLoadingComponent loading={true} showBackground={false}/>
                            : <>
                                <div id='game-board-groups'>
                                    {gruposActuales.map((g, i) => (
                                        <div className='game-board-group' key={g.map(claveCarta).join('|')}>
                                            <div className='game-board-group-cards'>{g.map((c) => carta(c, false))}</div>
                                            <Button size='small' onClick={() => soltarGrupo(i)}>Soltar grupo</Button>
                                        </div>
                                    ))}
                                </div>
                                <div id='game-board-loose'>
                                    {sueltas.map((c) => carta(c, true))}
                                </div>
                                {
                                    mano
                                        ? <p>Sueltas: {sueltas.length} cartas, {puntos(sueltas)} pts</p>
                                        : <></>
                                }
                            </>
                    }
                </div>
                <div id='game-board-actions'>
                    <Button
                        className='game-board-actions-button'
                        variant='outlined'
                        onClick={formarGrupo}
                        disabled={!mano || seleccionadas.length === 0}
                    >Formar grupo</Button>
                    <Button
                        className='game-board-actions-button'
                        variant='contained'
                        onClick={descartar}
                        disabled={!conOnceCartas || enviando}
                    >Descartar</Button>
                    <Button
                        className='game-board-actions-button'
                        variant='contained'
                        color='secondary'
                        onClick={cerrar}
                        disabled={!conOnceCartas || enviando || !!ronda?.turno.intentoCierre}
                    >{esApuntado ? 'Cerrar / Tocar (< 5 pts)' : 'Cerrar con 4-3-3'}</Button>
                </div>
            </div>
            <GlobalLoadingComponent loading={enviando}/>
        </>
    );
}
