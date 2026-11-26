/**
 * Socket.io namespace, events and listeners.
 * @readonly
 */
export enum SocketConstants {
    /**
     * Namespace of the games socket.
     */
    GAME_SOCKET_NAMESPACE = 'game',
    /**
     * Event to connect to the current game's rooms.
     */
    GAME_CONNECTION_EVENT = 'GAME_CONNECTION_EVENT',
    /**
     * A user joined the table.
     */
    JOIN_PLAYER_LISTENER = 'JOIN_PLAYER_LISTENER',
    /**
     * The table is full and ready to start.
     */
    GAME_READY_TO_START_LISTENER = 'GAME_READY_TO_START_LISTENER',
    /**
     * The match started.
     */
    MATCH_STARTED_LISTENER = 'MATCH_STARTED_LISTENER',
    /**
     * The turn changed.
     */
    SHIFT_CHANGED_LISTENER = 'SHIFT_CHANGED_LISTENER',
    /**
     * The draw pile was refilled.
     */
    CARD_DECK_FILLED_LISTENER = 'CARD_DECK_FILLED_LISTENER',
    /**
     * A card was taken from the discard pile.
     */
    CARD_PULLED_FROM_DISCARDED_LISTENER = 'CARD_PULLED_FROM_DISCARDED_LISTENER',
    /**
     * A player's close attempt failed.
     */
    PLAYER_CANT_WIN_LISTENER = 'PLAYER_CANT_WIN_LISTENER',
    /**
     * Public room: a round was closed and scored.
     */
    MATCH_WON_LISTENER = 'MATCH_WON_LISTENER',
    /**
     * Public room: a player drew from the deck (the card is not revealed).
     */
    CARD_PULLED_FROM_DECK_LISTENER = 'CARD_PULLED_FROM_DECK_LISTENER',
    /**
     * Public room: a player knocked and the extra round starts.
     */
    PLAYER_KNOCKED_LISTENER = 'PLAYER_KNOCKED_LISTENER',
    /**
     * Public room: a new round started (Apuntado).
     */
    ROUND_STARTED_LISTENER = 'ROUND_STARTED_LISTENER',
    /**
     * Public room: the match ended and the pot was paid.
     */
    GAME_FINISHED_LISTENER = 'GAME_FINISHED_LISTENER',
    /**
     * Private room `user:{id}`: the player's hand.
     */
    PRIVATE_HAND_LISTENER = 'PRIVATE_HAND_LISTENER',
}

/**
 * Public room `match:{id}` messages that carry the public match view.
 */
export const PUBLIC_MATCH_MESSAGES: SocketConstants[] = [
    SocketConstants.MATCH_STARTED_LISTENER,
    SocketConstants.SHIFT_CHANGED_LISTENER,
    SocketConstants.CARD_DECK_FILLED_LISTENER,
    SocketConstants.CARD_PULLED_FROM_DISCARDED_LISTENER,
    SocketConstants.CARD_PULLED_FROM_DECK_LISTENER,
    SocketConstants.PLAYER_CANT_WIN_LISTENER,
    SocketConstants.PLAYER_KNOCKED_LISTENER,
    SocketConstants.MATCH_WON_LISTENER,
    SocketConstants.ROUND_STARTED_LISTENER,
    SocketConstants.GAME_FINISHED_LISTENER,
];