import {JSX} from 'react';
import './brand.component.css';

/**
 * App brand: the corner index of an ace (A and spade) plus the name.
 * @param props.size Brand size.
 * @param props.showName Shows the name next to the mark.
 */
export function BrandComponent(props: { size?: 'sm' | 'md' | 'lg'; showName?: boolean }): JSX.Element {
    const size = props.size ?? 'md';
    return (
        <span className={`brand brand-${size}`}>
            <span className='brand-mark' aria-hidden='true'>
                <span className='brand-mark-letter'>A</span>
                <span className='brand-mark-suit'>♠</span>
            </span>
            {props.showName !== false ? <span className='brand-name'>Apuntado</span> : <></>}
        </span>
    );
}
