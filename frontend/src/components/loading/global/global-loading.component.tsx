import {Backdrop, CircularProgress} from '@mui/material';
import {JSX} from 'react';

/**
 * Full-screen loading overlay.
 * @param props.loading Whether to show it.
 */
export function GlobalLoadingComponent(
    props: {
        loading: boolean,
    }
): JSX.Element {
    return (
        <Backdrop
            open={props.loading}
            sx={{zIndex: (theme) => theme.zIndex.modal + 1}}
        >
            <CircularProgress color='primary' thickness={5} aria-label='Cargando'/>
        </Backdrop>
    );
}
