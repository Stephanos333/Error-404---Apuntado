import {CSSProperties, JSX} from 'react';
import {CardComponent} from '../card/card.component.tsx';
import './card-fan.component.css';

/** A card as image suit + rank. */
export type FanCard = { suit: string; type: string };

/**
 * Cards held in a fan along an arc. Groups are separated by a small gap so a hand like
 * "cuarta + terna + terna" reads at a glance.
 * @param props.groups Card groups, left to right.
 * @param props.designName Card design.
 * @param props.labels Optional label under each group.
 * @param props.spread Degrees between neighbouring cards.
 * @param props.dealIn Plays the deal animation once on mount.
 */
export function CardFanComponent(props: {
    groups: FanCard[][];
    designName: string;
    labels?: string[];
    spread?: number;
    dealIn?: boolean;
    className?: string;
}): JSX.Element {
    const flat = props.groups.flatMap((group, g) => group.map((card, i) => ({...card, g, first: i === 0 && g > 0})));
    const total = flat.length;
    const spread = props.spread ?? 5;
    const middle = (total - 1) / 2;

    return (
        <div className={`card-fan ${props.dealIn ? 'card-fan-deal' : ''} ${props.className ?? ''}`}>
            <div className='card-fan-cards'>
                {flat.map((card, i) => {
                    const offset = i - middle;
                    const style = {
                        '--rot': `${offset * spread}deg`,
                        // Parabolic arc: cards further from the centre sit lower.
                        '--drop': `${Math.pow(offset, 2) * 1.6}px`,
                        '--delay': `${i * 55}ms`,
                    } as CSSProperties;
                    return (
                        <span key={`${card.suit}-${card.type}-${i}`} className={`card-fan-slot ${card.first ? 'card-fan-group-start' : ''}`} style={style}>
                            <CardComponent designName={props.designName} suit={card.suit} type={card.type}/>
                        </span>
                    );
                })}
            </div>
            {
                props.labels
                    ? <div className='card-fan-labels' aria-hidden='true'>
                        {props.groups.map((group, g) => (
                            <span key={g} style={{flexGrow: group.length}}>{props.labels?.[g]}</span>
                        ))}
                    </div>
                    : <></>
            }
        </div>
    );
}
