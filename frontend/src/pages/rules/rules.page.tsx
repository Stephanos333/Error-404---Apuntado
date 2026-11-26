import {JSX} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@mui/material';
import {PictureAsPdfRounded} from '@mui/icons-material';
import {CardComponent} from '../../components/card/card.component.tsx';
import {hasSession} from '../../config/user.context.tsx';
import {RoutesConstants} from '../../config/routes.constants.ts';
import TutorialPDF from '../../../public/assets/documents/Tutorial.pdf';
import './rules.page.css';

type ExampleCard = { suit: string; type: string };

/** A short row of small cards used as a visual example. */
function CardRow(props: { cards: ExampleCard[]; caption: string }): JSX.Element {
    return (
        <figure className='rules-example'>
            <div className='rules-example-cards'>
                {props.cards.map((card, i) => (
                    <CardComponent key={`${card.suit}-${card.type}-${i}`} designName='DEFAULT' suit={card.suit} type={card.type}/>
                ))}
            </div>
            <figcaption>{props.caption}</figcaption>
        </figure>
    );
}

/** Table of contents entries. */
const SECTIONS = [
    {id: 'turn', label: 'Tu turno'},
    {id: 'melds', label: 'Combinaciones'},
    {id: 'points', label: 'Valor de las cartas'},
    {id: 'classic', label: 'Clásica 4-3-3'},
    {id: 'apuntado', label: 'Apuntado a 101'},
    {id: 'tokens', label: 'Fichas y pozo'},
];

/**
 * "How to play" page: the rules of both modes, summarized from the rule plug-ins.
 */
export function RulesPage(): JSX.Element {
    return (
        <div className='rules-page page-width'>
            <header className='rules-header'>
                <h1>Cómo se juega</h1>
                <p className='rules-lead muted'>
                    Apuntado es un juego de cartas de 2 a 6 jugadores. El objetivo es organizar tu mano
                    en grupos antes que los demás. Cada jugador recibe 10 cartas y quien empieza recibe 11.
                </p>
                <Button href={TutorialPDF} target='_blank' rel='noopener noreferrer' startIcon={<PictureAsPdfRounded/>} color='inherit' variant='outlined'>
                    Abrir el tutorial en PDF
                </Button>
            </header>

            <div className='rules-layout'>
                <nav className='rules-toc' aria-label='Secciones'>
                    {SECTIONS.map((section) => <a key={section.id} href={`#/rules#${section.id}`} onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(section.id)?.scrollIntoView({behavior: 'smooth', block: 'start'});
                    }}>{section.label}</a>)}
                </nav>

                <div className='rules-content'>
                    <section id='turn' className='rules-section'>
                        <h2>Tu turno</h2>
                        <ol className='rules-steps'>
                            <li><strong>Roba</strong> una carta del mazo o la de arriba del pozo de descarte.</li>
                            <li><strong>Organiza</strong> tus cartas en grupos. Puedes formar hasta 4.</li>
                            <li><strong>Descarta</strong> una carta para pasar el turno, o <strong>cierra</strong> si tu mano ya está lista.</li>
                        </ol>
                    </section>

                    <section id='melds' className='rules-section'>
                        <h2>Combinaciones</h2>
                        <p>Un grupo de 3 cartas es una <strong>terna</strong> y uno de 4 es una <strong>cuarta</strong>. Valen dos tipos de grupo:</p>
                        <div className='rules-examples'>
                            <CardRow caption='Mismo valor: tres sietes.' cards={[{suit: 'HEART', type: 'C7'}, {suit: 'CLUB', type: 'C7'}, {suit: 'DIAMOND', type: 'C7'}]}/>
                            <CardRow caption='Escalera: mismo palo y valores seguidos.' cards={[{suit: 'SPADE', type: 'C9'}, {suit: 'SPADE', type: 'C10'}, {suit: 'SPADE', type: 'J'}, {suit: 'SPADE', type: 'Q'}]}/>
                            <CardRow caption='La escalera puede dar la vuelta de la K al As.' cards={[{suit: 'HEART', type: 'K'}, {suit: 'HEART', type: 'A'}, {suit: 'HEART', type: 'C2'}]}/>
                        </div>
                        <p className='muted'>En un grupo puede haber como máximo dos copias de la misma carta (cuando se juega con dos barajas).</p>
                    </section>

                    <section id='points' className='rules-section'>
                        <h2>Valor de las cartas</h2>
                        <p>Las cartas que no combinas suman puntos en tu contra.</p>
                        <dl className='rules-points'>
                            <div><dt>As, J, Q y K</dt><dd className='num'>10</dd></div>
                            <div><dt>Del 2 al 10</dt><dd>su número</dd></div>
                        </dl>
                    </section>

                    <section id='classic' className='rules-section rules-mode'>
                        <span className='rules-mode-figure num' aria-hidden='true'>4-3-3</span>
                        <div>
                            <h2>Clásica 4-3-3</h2>
                            <p>Se juega una sola ronda. Para ganar, baja una cuarta, dos ternas y la carta que descartas, sin que te sobre ninguna. Quien cierra primero gana el pozo.</p>
                            <p className='muted'>Si declaras un cierre que no es válido, el turno sigue y puedes descartar.</p>
                        </div>
                    </section>

                    <section id='apuntado' className='rules-section rules-mode rules-mode-alt'>
                        <span className='rules-mode-figure num' aria-hidden='true'>101</span>
                        <div>
                            <h2>Apuntado a 101</h2>
                            <p>Se juegan varias rondas. Al final de cada una, cada jugador suma los puntos de las cartas que no combinó.</p>
                            <ul>
                                <li><strong>Cerrar con 4-3-3</strong> termina la ronda y te resta 10 puntos.</li>
                                <li><strong>Tocar</strong>: con tres ternas y una carta suelta de menos de 5 puntos. Cada rival juega un último turno y luego se cuentan los puntos.</li>
                                <li>Quien llega a <strong>101 puntos</strong> o más queda eliminado.</li>
                                <li>Gana el último jugador que quede, o quien baje a <strong>−51 puntos</strong> o menos.</li>
                                <li>Un cierre que no es válido suma <strong>3 puntos</strong> de castigo y el turno sigue.</li>
                            </ul>
                        </div>
                    </section>

                    <section id='tokens' className='rules-section'>
                        <h2>Fichas y pozo</h2>
                        <p>Al crear la mesa se fija cuántas fichas apuesta cada jugador. Las apuestas forman el pozo y el ganador se lo lleva completo.</p>
                        {
                            hasSession()
                                ? <Button component={Link} to={RoutesConstants.HOME_ROUTE} variant='contained' size='large'>Ir a jugar</Button>
                                : <Button component={Link} to={RoutesConstants.REGISTER_ROUTE} variant='contained' size='large'>Crear cuenta y jugar</Button>
                        }
                    </section>
                </div>
            </div>
        </div>
    );
}
