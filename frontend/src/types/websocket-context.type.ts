import {Socket} from 'socket.io-client';

/**
 * Websocket context data.
 */
export interface WebsocketContextType {
    socket: Socket | undefined;
    connectWebSocket: () => void;
}