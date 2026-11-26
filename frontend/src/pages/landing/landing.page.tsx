import {JSX} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@mui/material';
import {AppShellComponent} from '../../components/app-shell/app-shell.component.tsx';
import {CardFanComponent, FanCard} from '../../components/card-fan/card-fan.component.tsx';
import {CardBackComponent} from '../../components/card/card.component.tsx';
import {TokenIconComponent} from '../../components/token/token.component.tsx';
import {hasSession} from '../../config/user.context.tsx';
import {RoutesConstants} from '../../config/routes.constants.ts';
import './landing.page.css';

/** The winning hand shown in the hero: a four of a kind, a run and a three of a kind. */
const WINNING_HAND: FanCard[][] = [
    [{suit: 'HEART', type: 'C7'}, {suit: 'SPADE', type: 'C7'}, {suit: 'DIAMOND', type: 'C7'}, {suit: 'CLUB', type: 'C7'}],
    [{suit: 'SPADE', type: 'J'}, {suit: 'SPADE', type: 'Q'}, {suit: 'SPADE', type: 'K'}],
    [{suit: 'DIAMOND', type: 'C3'}, {suit: 'CLUB', type: 'C3'}, {suit: 'HEART', type: 'C3'}],
];

/** Steps of a match, in order. */
const STEPS: ReadonlyArray<{ title: string; text: string }> = [
    {title: 'Arma la mesa', text: 'Elige la modalidad, de 2 a 6 jugadores y cuántas fichas apuesta cada uno.'},
    {title: 'Invita', text: 'Comparte el enlace de la sala o deja la mesa pública para que cualquiera se siente.'},
    {title: 'Juega tu turno', text: 'Roba del mazo o del pozo, ordena tus cartas en grupos y descarta una.'},
    {title: 'Cierra primero', text: 'Baja tu 4-3-3 antes que los demás y llévate el pozo.'},
];

/**
 * Public landing page: what Apuntado is, its two modes and how a match goes.
 */
export function LandingPage(): JSX.Element {
    const loggedIn: boolean = hasSession();

    const primaryCta = loggedIn
        ? <Button component={Link} to={RoutesConstants.HOME_ROUTE} variant='contained' size='large'>Ir a jugar</Button>
        : <Button component={Link} to={RoutesConstants.REGISTER_ROUTE} variant='contained' size='large'>Crear cuenta y jugar</Button>;

    return (
        <AppShellComponent bleed>
            <section className='landing-hero'>
                <div className='landing-hero-inner page-width'>
                    <div className='landing-hero-copy'>
                        <h1>Cuarta, terna y terna.</h1>
                        <p className='landing-hero-lead'>
                            Juega Apuntado con tus amigos desde el navegador: arma una mesa, comparte el
                            enlace y cierra antes que nadie.
                        </p>
                        <div className='landing-hero-actions'>
                            {primaryCta}
                            {
                                loggedIn
                                    ? <Button component={Link} to={RoutesConstants.RULES_ROUTE} size='large' color='inherit'>Repasar las reglas</Button>
                                    : <Button component={Link} to={RoutesConstants.LOGIN_ROUTE} size='large' color='inherit'>Ya tengo cuenta</Button>
                            }
                        </div>
                        <p className='landing-hero-note muted'>
                            <TokenIconComponent size={16}/> Empiezas con 100 fichas para apostar.
                        </p>
                    </div>
                    <div className='landing-hero-table' aria-label='Ejemplo de mano ganadora: una cuarta de sietes, una escalera de picas y una terna de treses'>
                        <CardFanComponent groups={WINNING_HAND} designName='DEFAULT' labels={['Cuarta', 'Terna', 'Terna']} dealIn spread={4}/>
                    </div>
                </div>
            </section>

            <section className='landing-modes page-width' aria-labelledby='landing-modes-title'>
                <h2 id='landing-modes-title'>Dos formas de jugar</h2>
                <div className='landing-modes-grid'>
                    <article className='landing-mode'>
                        <span className='landing-mode-figure num' aria-hidden='true'>4-3-3</span>
                        <div>
                            <h3>Clásica</h3>
                            <p>
                                Una sola ronda. Gana quien baje primero una cuarta, dos ternas y la carta
                                que descarta, sin que le sobre ninguna. Se lleva todo el pozo.
                            </p>
                        </div>
                    </article>
                    <article className='landing-mode landing-mode-alt'>
                        <span className='landing-mode-figure num' aria-hidden='true'>101</span>
                        <div>
                            <h3>Apuntado a 101</h3>
                            <p>
                                Varias rondas. Las cartas que te quedan sin combinar suman puntos y con 101
                                quedas fuera. Cerrar con 4-3-3 te resta 10; también puedes tocar con tres
                                ternas y una carta de menos de 5 puntos.
                            </p>
                        </div>
                    </article>
                </div>
            </section>

            <section className='landing-steps page-width' aria-labelledby='landing-steps-title'>
                <h2 id='landing-steps-title'>Así va una partida</h2>
                <ol className='landing-steps-list'>
                    {STEPS.map((step, i) => (
                        <li key={step.title}>
                            <span className='landing-step-index num' aria-hidden='true'>{i + 1}</span>
                            <h3>{step.title}</h3>
                            <p className='muted'>{step.text}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section className='landing-cta'>
                <div className='landing-cta-inner page-width'>
                    <div className='landing-cta-deck' aria-hidden='true'>
                        <CardBackComponent/>
                        <CardBackComponent/>
                        <CardBackComponent/>
                    </div>
                    <div>
                        <h2>La mesa está servida.</h2>
                        <p className='muted'>Partidas de 2 a 6 jugadores, en tiempo real.</p>
                    </div>
                    {primaryCta}
                </div>
            </section>

            <footer className='landing-footer page-width muted'>
                <span>Apuntado, por el equipo Error 404.</span>
                <Link to={RoutesConstants.RULES_ROUTE}>Reglas completas</Link>
            </footer>
        </AppShellComponent>
    );
}
