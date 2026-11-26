/**
 * App routes.
 * @enum {string}
 * @readonly
 */
export enum RoutesConstants {
    /** Any unknown route. */
    ALL_ROUTES = '*',
    /** Card designs (shop and preview). */
    CARD_DESIGNS_ROUTE = '/card-designs',
    /** Public landing page. */
    DEFAULT_ROUTE = '/',
    /** Game table. */
    GAME = '/game/playing',
    /** Waiting room. */
    WAITING_GAME_ROUTE = '/game/waiting',
    /** Lobby shown after logging in. */
    HOME_ROUTE = '/home',
    /** Joins a game from an invitation link and redirects. */
    JOIN_GAME = '/game/join',
    /** Log in. */
    LOGIN_ROUTE = '/login',
    /** Create an account. */
    REGISTER_ROUTE = '/register',
    /** How to play. */
    RULES_ROUTE = '/rules',
    /** Final result of a match. */
    SHOW_MATCH_WINNER = '/game/match-winner',
}
