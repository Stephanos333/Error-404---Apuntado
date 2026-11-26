import {JSX, ReactNode} from 'react';
import {BrandComponent} from '../brand/brand.component.tsx';
import './game-top-bar.component.css';

/**
 * Slim bar for the waiting room and the table: brand, a title and page actions, without
 * the main navigation so the game keeps the focus.
 * @param props.title Text next to the brand.
 * @param props.children Actions on the right.
 */
export function GameTopBarComponent(props: { title?: ReactNode; children?: ReactNode }): JSX.Element {
    return (
        <header className='game-top-bar'>
            <div className='game-top-bar-start'>
                <BrandComponent size='sm' showName={false}/>
                {props.title ? <span className='game-top-bar-title'>{props.title}</span> : <></>}
            </div>
            <div className='game-top-bar-end'>{props.children}</div>
        </header>
    );
}
