import {JSX} from 'react';

/**
 * Small crown marking the table host.
 * @param props.size Width in pixels.
 * @param props.title Accessible title.
 */
export function CrownIconComponent(props: { size?: number; title?: string }): JSX.Element {
    const size = props.size ?? 18;
    return (
        <svg width={size} height={size * 0.75} viewBox='0 0 24 18' role='img' aria-label={props.title ?? 'Anfitrión'}>
            <title>{props.title ?? 'Anfitrión'}</title>
            <path d='M2 6l5 4 5-8 5 8 5-4-2 10H4z' fill='var(--brass-400)' stroke='var(--brass-700)' strokeWidth='1.4' strokeLinejoin='round'/>
        </svg>
    );
}
