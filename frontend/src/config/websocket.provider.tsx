import {createContext, ReactNode, useContext, useState} from 'react';
import {WebsocketContextType} from '../types/websocket-context.type.ts';
import {io, Socket} from 'socket.io-client';
import {LocaleStorageUtils} from '../store/locale-storage.utils.ts';
import {LocaleStorageConstants} from '../store/locale-storage.constants.ts';
import {SocketConstants} from '../utils/constants/socket.constants.ts';


/** Websocket context. */
const WebSocketContext = createContext<WebsocketContextType | undefined>(undefined);

/**
 * Provides the app's socket (namespace `game`), connected on demand after logging in.
 * @param children The app.
 */
export const WebsocketProvider = ({children}: { children: ReactNode }) => {

    /** The socket.io client. */
    const [socket, setSocket] = useState<Socket | undefined>(undefined);

    /** Connects the socket with the stored access token. */
    const connect = (): void => {
        const token: string | null = LocaleStorageUtils.get<LocaleStorageConstants.KEY_ACCESS_TOKEN>(LocaleStorageConstants.KEY_ACCESS_TOKEN);
        if (token && !socket) {
            const url: string = `${import.meta.env.VITE_BACKEND_BASE_URL}/${SocketConstants.GAME_SOCKET_NAMESPACE}`;
            const socket = io(url, {
                extraHeaders: {authorization: `Bearer ${token}`},
                autoConnect: false,
                reconnection: true,
            });
            socket.connect();
            socket.on('connect_error', (error: Error) => {
                console.error(`[WebSocket] No se pudo conectar: ${error.message}`);
            });
            setSocket(socket);
        }
    };

    return (
        <WebSocketContext.Provider value={{socket, connectWebSocket: connect}}>
            {children}
        </WebSocketContext.Provider>
    );
};

/** Reads the socket context. */
export const useWebSocket = (): WebsocketContextType => {
    const context: WebsocketContextType | undefined = useContext(WebSocketContext);
    if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
    return context;
};