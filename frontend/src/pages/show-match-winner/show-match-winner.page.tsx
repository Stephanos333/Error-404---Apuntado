import {JSX} from 'react';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {Button} from '@mui/material';
import {RoutesConstants} from '../../config/app.router.tsx';
import {VistaPublicaPartida} from '../../types/partida.type.ts';

/**
 * Página que muestra el ganador y el marcador final de la partida. Recibe la vista
 * pública final desde el tablero (estado de la navegación).
 * @constructor
 */
export function ShowMatchWinnerPage(): JSX.Element {
    const navigate = useNavigate();
    const partida: VistaPublicaPartida | undefined = (useLocation().state as { partida?: VistaPublicaPartida } | null)?.partida;
    if (!partida) return <Navigate to={RoutesConstants.HOME_ROUTE}/>;

    const nombreDe = (jugadorId: string | null): string =>
        partida.jugadores.find((j) => j.jugadorId === jugadorId)?.nombreUsuario ?? 'Sin ganador';
    const jugadores = [...partida.jugadores].sort((a, b) => a.puntaje - b.puntaje);

    return (
        <div className='page-container' style={{display: 'flex', flexFlow: 'column', alignItems: 'center', justifyContent: 'center', gap: 16}}>
            <h1>Ganador: {nombreDe(partida.ganadorId)}</h1>
            <p>Pozo: {partida.pozo.total} tokens · Rondas jugadas: {partida.marcador.length}</p>
            <table>
                <thead>
                    <tr><th>Jugador</th><th>Puntaje</th><th>Estado</th></tr>
                </thead>
                <tbody>
                    {jugadores.map((j) => (
                        <tr key={j.jugadorId}><td>{j.nombreUsuario}</td><td>{j.puntaje}</td><td>{j.estado}</td></tr>
                    ))}
                </tbody>
            </table>
            <Button variant='contained' onClick={() => navigate(RoutesConstants.HOME_ROUTE)}>Volver al inicio</Button>
        </div>
    );
}
