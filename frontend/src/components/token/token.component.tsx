import {JSX} from 'react';
import './token.component.css';

/**
 * Brass chip (the game token).
 * @param props.size Diameter in pixels.
 */
export function TokenIconComponent(props: { size?: number }): JSX.Element {
    const size = props.size ?? 18;
    return <span className='token-icon' style={{width: size, height: size}} aria-hidden='true'/>;
}

/**
 * Token amount with its chip icon.
 * @param props.amount The amount.
 * @param props.label Accessible label (defaults to "fichas").
 * @param props.size Visual size.
 */
export function TokenAmountComponent(props: { amount: number | string; label?: string; size?: 'sm' | 'md' | 'lg' }): JSX.Element {
    const size = props.size ?? 'md';
    const icon = size === 'lg' ? 30 : size === 'sm' ? 15 : 19;
    return (
        <span className={`token-amount token-amount-${size}`}>
            <TokenIconComponent size={icon}/>
            <span className='num'>{props.amount}</span>
            <span className='visually-hidden'> {props.label ?? 'fichas'}</span>
        </span>
    );
}
