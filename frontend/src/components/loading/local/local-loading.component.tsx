import {CircularProgress} from '@mui/material';
import {JSX} from 'react';

/**
 * Inline loading indicator that fills and centers inside its container.
 * @param props.loading Whether to show it.
 * @param props.showBackground Darkens the block background.
 * @param props.label Optional text under the spinner.
 */
export function LocalLoadingComponent(
    props: {
        loading: boolean,
        showBackground: boolean,
        label?: string,
    }
): JSX.Element {
    if (!props.loading) return <></>;
    return (
        <div
            role='status'
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                width: '100%',
                minHeight: 120,
                padding: 24,
                borderRadius: 'inherit',
                background: props.showBackground ? 'rgba(8, 38, 39, 0.5)' : 'transparent',
                color: 'inherit',
            }}
        >
            <CircularProgress color='inherit' size={28} thickness={5}/>
            <span style={{fontSize: '0.875rem', opacity: 0.75}}>{props.label ?? 'Cargando…'}</span>
        </div>
    );
}
