import ReactDOM from 'react-dom/client';
import {RouterProvider} from 'react-router-dom';
import {CssBaseline, ThemeProvider} from '@mui/material';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/figtree/index.css';
import {AppTheme} from './config/app.theme.tsx';
import {AppRouter} from './config/app.router.tsx';
import './main.css';
import {WebsocketProvider} from './config/websocket.provider.tsx';

/** App entry: theme, socket provider and router. */
ReactDOM.createRoot(document.getElementById('root')!).render(
    <ThemeProvider theme={AppTheme}>
        <CssBaseline/>
        <WebsocketProvider>
            <RouterProvider router={AppRouter}/>
        </WebsocketProvider>
    </ThemeProvider>
);
