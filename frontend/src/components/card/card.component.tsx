import {CSSProperties, JSX} from 'react';
import './card.component.css';

/** Readable name of each image suit. */
const SUIT_NAMES: Record<string, string> = {CLUB: 'tréboles', DIAMOND: 'diamantes', HEART: 'corazones', SPADE: 'picas'};

/** Readable name of each image rank. */
const RANK_NAMES: Record<string, string> = {
    A: 'As', C2: '2', C3: '3', C4: '4', C5: '5', C6: '6', C7: '7', C8: '8', C9: '9', C10: '10', J: 'J', Q: 'Q', K: 'K',
};

/**
 * Accessible card name, in Spanish for the UI: "As de picas", "7 de corazones".
 * @param {string} suit The image suit.
 * @param {string} type The image rank.
 */
export const cardLabel = (suit: string, type: string): string =>
    `${RANK_NAMES[type] ?? type} de ${SUIT_NAMES[suit] ?? suit}`;

/**
 * A playing card drawn with the chosen design's image.
 * With `onClick` it renders as a button (keyboard selectable).
 * @param props.designName The card design.
 * @param props.suit The image suit.
 * @param props.type The image rank.
 * @param props.positionClassName Extra classes to size or place the card.
 * @param props.selected Marks the card as selected (lifted).
 * @param props.disabled Disables clicking.
 * @param props.style Inline styles (e.g. rotation inside a fan).
 * @param props.onClick Action on click or Enter/Space.
 */
export function CardComponent(
    props: {
        designName: string;
        suit: string;
        type: string;
        positionClassName?: string;
        selected?: boolean;
        disabled?: boolean;
        style?: CSSProperties;
        title?: string;
        onClick?: () => void;
    }
): JSX.Element {

    /** Image URL. */
    const imageRoute: string = `${import.meta.env.VITE_CARD_IMAGES_URL}${props.designName}/${props.suit}-${props.type}.png`;
    const label: string = cardLabel(props.suit, props.type);
    const classes: string = `playing-card ${props.selected ? 'is-selected' : ''} ${props.positionClassName ?? ''}`;

    if (props.onClick) {
        return (
            <button
                type='button'
                className={`${classes} is-interactive`}
                style={props.style}
                aria-pressed={!!props.selected}
                aria-label={label}
                title={props.title}
                disabled={props.disabled}
                onClick={() => props.onClick && props.onClick()}
            >
                <img alt='' src={imageRoute} draggable={false}/>
            </button>
        );
    }

    return (
        <span className={classes} style={props.style} title={props.title}>
            <img alt={label} src={imageRoute} draggable={false}/>
        </span>
    );
}

/**
 * Card back (draw pile and opponents' hands). Drawn with CSS so it matches the face
 * proportions and the table colors.
 * @param props.className Extra classes.
 * @param props.style Inline styles.
 */
export function CardBackComponent(props: { className?: string; style?: CSSProperties }): JSX.Element {
    return <span className={`playing-card card-back ${props.className ?? ''}`} style={props.style} aria-hidden='true'/>;
}
