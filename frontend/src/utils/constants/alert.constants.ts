/**
 * Alert severities.
 * @enum
 * @readonly
 */
export enum AlertTypeConstants {
    /** Error. */
    ERROR_ALERT = 'error',
    /** Success. */
    SUCCESS_ALERT = 'success',
    /** Warning. */
    WARNING_ALERT = 'warning',
}

/**
 * Alert text (Spanish UI copy) for each code. Keys are backend error codes or
 * frontend message codes.
 * @const {Record<string, string>}
 */
export const AlertMessagesConstants: Record<string, string> = {
    CARD_DESIGN_ID_IS_REQUIRED_ERROR: 'Elige un diseño primero.',
    CARD_DESIGN_WITHOUT_PURCHASING_ERROR: 'Ese diseño todavía no es tuyo.',
    INVALID_CREDENTIALS_ERROR: 'Usuario o contraseña incorrectos.',
    NOT_ENOUGH_TOKENS_ERROR: 'No tienes fichas suficientes para esa apuesta.',
    UNKNOWN_ERROR: 'Algo falló. Inténtalo de nuevo en un momento.',
    USER_ALREADY_EXISTS_ERROR: 'Ese nombre de usuario ya existe.',
    USER_IS_ALREADY_PLAYING_ERROR: 'Ya tienes una mesa en curso: vuelve a ella o sal para crear otra.',
    USER_IS_ALREADY_PLAYING_ERROR_JOINING: 'Ya tienes una mesa en curso: sal de ella para unirte a otra.',
    USER_NOT_FOUND_ERROR: 'Ese usuario no existe.',
    GAME_EXCEEDS_ITS_PLAYER_COUNT_ERROR: 'Esa mesa ya está llena.',
    GAME_NOT_FOUND_ERROR: 'No encontramos esa mesa. Revisa el código o el enlace.',
    INVALID_GAME_ID_ERROR: 'Ese código de mesa no es válido.',
    GAME_IS_ALREADY_FINISHED_ERROR: 'Esa mesa ya terminó.',
    SOMETHING_WENT_WRONG_ERROR: 'Algo salió mal.',
    COPY_ON_CLIP_BOARD_MESSAGE: 'Copiado en el portapapeles.',
    CARD_DESIGN_SAVED_MESSAGE: 'Listo: jugarás con este diseño.',
    PLAYER_CANT_WIN_MESSAGE: 'Aún no puedes ganar.',
    // Controlled errors of the match commands (backend codes, ADR-04).
    ROUND_ALREADY_CLOSED: 'La ronda ya se cerró: otro jugador se adelantó.',
    NOT_YOUR_TURN: 'No es tu turno.',
    STALE_VERSION: 'La partida cambió mientras jugabas; el tablero se actualizó.',
    INVALID_GROUPS: 'Los grupos no son válidos: máximo 4 grupos de 1 a 4 cartas, sin repetir y sin la carta de descarte.',
    INVALID_TURN_PHASE: 'Esa acción no corresponde ahora: primero roba, luego descarta o cierra.',
    CARD_NOT_IN_HAND: 'Esa carta ya no está en tu mano.',
    EMPTY_DISCARD_PILE: 'El pozo de descarte está vacío.',
    EMPTY_DECK: 'No quedan cartas para robar.',
    CLOSE_ALREADY_ATTEMPTED: 'Ya intentaste cerrar en este turno.',
    CLOSE_NOT_ALLOWED: 'Ese cierre no está permitido en esta modalidad o en la ronda extra.',
    PLAYER_NOT_IN_MATCH: 'No perteneces a esta partida.',
    MATCH_NOT_FOUND: 'La partida no existe o ya terminó.',
    USER_IS_NOT_PART_OF_A_GAME_ERROR: 'La partida terminó o ya no perteneces a ella.',
    MATCH_CANNOT_BE_STARTED_ERROR: 'La partida no se puede iniciar todavía.',
    ONLY_GAME_HOST_CAN_START_THE_MATCH_ERROR: 'Solo el anfitrión puede iniciar la partida.',
    // Table notices (local validation before sending).
    CLOSE_FAILED_MESSAGE: 'Tu declaración no cierra: se aplicó el castigo de la modalidad.',
    SELECT_ONE_CARD_MESSAGE: 'Selecciona una sola carta que no esté en un grupo.',
    SELECT_GROUP_CARDS_MESSAGE: 'Selecciona de 1 a 4 cartas sueltas para formar un grupo.',
    MAX_GROUPS_MESSAGE: 'Puedes formar como máximo 4 grupos.',
    SHAPE_4_3_3_MESSAGE: 'Para cerrar con 4-3-3: forma 1 cuarta y 2 ternas y selecciona la carta de descarte.',
    SHAPE_APUNTADO_MESSAGE: 'Forma 1 cuarta + 2 ternas, o 3 ternas + 1 sobrante (< 5 pts), y selecciona la carta de descarte.',
    // Match event notices (public room).
    YOU_KNOCKED_MESSAGE: 'Tocaste: los demás juegan un último turno antes de liquidar la ronda.',
    PLAYER_KNOCKED_MESSAGE: 'Un jugador tocó: te queda un último turno en esta ronda.',
    ROUND_STARTED_MESSAGE: 'La ronda terminó y se repartió una nueva.',
};