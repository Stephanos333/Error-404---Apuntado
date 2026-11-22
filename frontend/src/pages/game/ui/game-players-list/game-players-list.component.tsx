import './game-player-list.component.css';
import {JSX} from 'react';
import {PlayerWithUserType} from '../../../../types/player-with-user.type.ts';
import {buildProfileImageRoute} from '../../../../utils/profile-image.utils.ts';
import {LocalLoadingComponent} from '../../../../components/loading/local/local-loading.component.tsx';
import {GameType} from '../../../../types/game.type.ts';
import {VistaPublicaPartida} from '../../../../types/partida.type.ts';

/**
 * Componente de la lista de jugadores de la partida. El turno, el puntaje y el tamaño de
 * cada mano salen de la vista pública; el ícono, de los datos de la sala.
 * @param props Los parámetros necesarios para el funcionamiento del componente.
 * @param props.partida La vista pública de la partida.
 * @param props.players Los jugadores de la sala (para el ícono).
 * @param props.game El juego (para marcar al anfitrión).
 * @constructor
 */
export function GamePlayersListComponent(props: {
    partida: VistaPublicaPartida | undefined,
    players: PlayerWithUserType[] | undefined,
    game: GameType | undefined,
}): JSX.Element {
    const enTurno: string | undefined = props.partida?.ronda?.turno.jugadorId;
    const tocador: string | undefined = props.partida?.ronda?.rondaExtra?.tocadorId;
    const jugadores = props.partida ? [...props.partida.jugadores].sort((a, b) => a.posicion - b.posicion) : undefined;

    return (
        <>
            <div id='game-player-list-component-container' className='component-container'>
                {
                    jugadores
                        ? jugadores.map((jugador) => {
                            const sala = props.players?.find((p) => p.userId === jugador.jugadorId);
                            const esTurno = jugador.jugadorId === enTurno;
                            const eliminado = jugador.estado === 'ELIMINADO';
                            return (
                                <div
                                    className={`game-player-list-component-card ${esTurno ? 'game-player-list-component-card-selected' : ''} ${eliminado ? 'game-player-list-component-card-eliminated' : ''}`}
                                    key={jugador.jugadorId}>
                                    {
                                        sala
                                            ? <img
                                                alt=''
                                                className={`game-player-list-component-card-image ${esTurno ? 'game-player-image-spin' : ''}`}
                                                src={buildProfileImageRoute(sala.icon)}
                                            />
                                            : <></>
                                    }
                                    <div className='game-player-list-component-card-texts'>
                                        <p>{props.game && props.game.hostId === jugador.jugadorId ? 'King' : ''}{tocador === jugador.jugadorId ? ' Tocó' : ''}</p>
                                        <h4>{jugador.nombreUsuario}{jugador.conectado ? '' : ' (desconectado)'}</h4>
                                        <span>Puntos: {jugador.puntaje} · Cartas: {jugador.cartasEnMano}{eliminado ? ' · Eliminado' : ''}</span>
                                    </div>
                                </div>
                            );
                        })
                        : <LocalLoadingComponent loading={true} showBackground={false}/>
                }
            </div>
        </>
    );
}
