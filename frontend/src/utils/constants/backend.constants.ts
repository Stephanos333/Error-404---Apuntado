/**
 * Backend endpoints.
 * @enum {string}
 * @readonly
 */
export enum BackendConstants {
    /**
     * Create a game.
     */
    CREATE_GAME_URL = '/api/game',
    /**
     * Available card designs.
     */
    GET_ACTIVE_CARD_DESIGNS_URL = '/api/card-design/active',
    /**
     * The user's current card design.
     */
    GET_CURRENT_CARD_DESIGN_URL = '/api/card-design/current',
    /**
     * The authenticated user.
     */
    GET_ME_URL = '/api/user/me',
    /**
     * Public games.
     */
    GET_PUBLIC_GAMES_URL = '/api/game/public',
    /**
     * Join a game.
     */
    JOIN_GAME_URL = '/api/game/join',
    /**
     * Log in.
     */
    LOGIN_URL = '/api/session/login',
    /**
     * Sign up.
     */
    REGISTER_URL = '/api/user',
    /**
     * Refresh the access token.
     */
    REFRESH_ACCESS_TOKEN_URL = '/api/session/refresh-token',
    /**
     * Update the user's card design.
     */
    UPDATE_USER_CARD_DESIGN_URL = '/api/user/card-design',
    /**
     * Update the user's avatar.
     */
    UPDATE_USER_ICON_URL = '/api/user/icon',
    /**
     * The user's current game (also DELETE to leave or cancel it).
     */
    GET_CURRENT_GAME_URL = '/api/game/current',
    /**
     * The user's current player.
     */
    GET_CURRENT_PLAYER_URL = '/api/player/current',
    /**
     * Start the match (host).
     */
    START_MATCH_URL = '/api/match',
    /**
     * Current match state: public view and the user's hand (`matches` aggregate).
     */
    MATCH_STATE_URL = '/api/matches/current',
    /**
     * Draw command (deck or discard pile).
     */
    MATCH_DRAW_URL = '/api/matches/current/commands/draw',
    /**
     * Discard command (ends the turn).
     */
    MATCH_DISCARD_URL = '/api/matches/current/commands/discard',
    /**
     * Close command (4-3-3 or knock).
     */
    MATCH_CLOSE_URL = '/api/matches/current/commands/close',
}

/**
 * Configuration of each backend service
 * @const {Record<BackendConstants, BackendConfigType>}
 */
export const BackendConfigConstants: Record<BackendConstants, BackendConfigType> = {
    [BackendConstants.CREATE_GAME_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.GET_CURRENT_PLAYER_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.GET_ACTIVE_CARD_DESIGNS_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.GET_CURRENT_CARD_DESIGN_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.GET_ME_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.GET_PUBLIC_GAMES_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.JOIN_GAME_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.LOGIN_URL]: {
        requireAccessToken: false,
        retryRequest: false,
    },
    [BackendConstants.REGISTER_URL]: {
        requireAccessToken: false,
        retryRequest: false,
    },
    [BackendConstants.REFRESH_ACCESS_TOKEN_URL]: {
        requireAccessToken: false,
        retryRequest: false,
    },
    [BackendConstants.UPDATE_USER_CARD_DESIGN_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.UPDATE_USER_ICON_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.GET_CURRENT_GAME_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.START_MATCH_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.MATCH_STATE_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.MATCH_DRAW_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.MATCH_DISCARD_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
    [BackendConstants.MATCH_CLOSE_URL]: {
        requireAccessToken: true,
        retryRequest: true,
    },
};

/**
 * Configuration a backend service must define.
 */
export type BackendConfigType = {
    requireAccessToken: boolean;
    retryRequest: boolean;
}