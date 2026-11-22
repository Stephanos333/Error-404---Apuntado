/**
 * Constantes que define los tipos de alertas que maneja la aplicación.
 * @enum
 * @readonly
 */
export enum AlertTypeConstants {
    /**
     * Alerta que es un mensaje de error.
     */
    ERROR_ALERT = 'error',
    /**
     * Alerta que es un mensaje satisfactorio.
     */
    SUCCESS_ALERT = 'success',
    /**
     * Alerta que es una advertencia.
     */
    WARNING_ALERT = 'warning',
}

/**
 * Constantes que definen lo mensajes de las alertas de la aplicación.
 * @const {Record<string, string>}
 */
export const AlertMessagesConstants: Record<string, string> = {
    CARD_DESIGN_ID_IS_REQUIRED_ERROR: '¡Diseño de carta requerido!',
    INVALID_CREDENTIALS_ERROR: '¡Credenciales inválidas!',
    NOT_ENOUGH_TOKENS_ERROR: '¡No tienes tokens suficientes!',
    UNKNOWN_ERROR: 'Intente más tarde',
    USER_ALREADY_EXISTS_ERROR: '¡El usuario ya existe!',
    USER_IS_ALREADY_PLAYING_ERROR: '¡No puedes crear un juego si ya estás jugando!',
    USER_IS_ALREADY_PLAYING_ERROR_JOINING: '¡No puedes ingresar a un juego si ya estás jugando!',
    USER_NOT_FOUND_ERROR: '¡El usuario no existe!',
    GAME_EXCEEDS_ITS_PLAYER_COUNT_ERROR: '¡El juego ya está lleno!',
    SOMETHING_WENT_WRONG_ERROR: '¡Algo salió mal!',
    COPY_ON_CLIP_BOARD_MESSAGE: '¡Copiado en el portapapeles!',
    PLAYER_CANT_WIN_MESSAGE: '¡Aún no puedes ganar!',
    // Errores controlados de los comandos de la partida (backend, ADR-04).
    RONDA_YA_CERRADA: 'La ronda ya se cerró: otro jugador se adelantó.',
    TURNO_NO_CORRESPONDE: 'No es tu turno.',
    VERSION_DESACTUALIZADA: 'La partida cambió mientras jugabas; el tablero se actualizó.',
    GRUPOS_INVALIDOS: 'Los grupos no son válidos: máximo 4 grupos de 1 a 4 cartas, sin repetir y sin la carta de descarte.',
    FASE_DE_TURNO_INVALIDA: 'Esa acción no corresponde ahora: primero roba, luego descarta o cierra.',
    CARTA_NO_ESTA_EN_LA_MANO: 'Esa carta ya no está en tu mano.',
    POZO_DESCARTE_VACIO: 'El pozo de descarte está vacío.',
    MAZO_VACIO: 'No quedan cartas para robar.',
    YA_INTENTO_CIERRE_EN_EL_TURNO: 'Ya intentaste cerrar en este turno.',
    CIERRE_NO_PERMITIDO: 'Ese cierre no está permitido en esta modalidad o en la ronda extra.',
    JUGADOR_NO_PERTENECE_A_LA_PARTIDA: 'No perteneces a esta partida.',
    PARTIDA_NO_ENCONTRADA: 'La partida no existe o ya terminó.',
    USER_IS_NOT_PART_OF_A_GAME_ERROR: 'La partida terminó o ya no perteneces a ella.',
    MATCH_CANNOT_BE_STARTED_ERROR: 'La partida no se puede iniciar todavía.',
    ONLY_GAME_HOST_CAN_START_THE_MATCH_ERROR: 'Solo el anfitrión puede iniciar la partida.',
    // Avisos del tablero (validación local antes de enviar).
    CIERRE_FALLIDO_MESSAGE: 'Tu declaración no cierra: se aplicó el castigo de la modalidad.',
    SELECCIONA_UNA_CARTA_MESSAGE: 'Selecciona una sola carta que no esté en un grupo.',
    SELECCIONA_CARTAS_GRUPO_MESSAGE: 'Selecciona de 1 a 4 cartas sueltas para formar un grupo.',
    MAXIMO_GRUPOS_MESSAGE: 'Puedes formar como máximo 4 grupos.',
    FORMA_4_3_3_MESSAGE: 'Para cerrar con 4-3-3: forma 1 cuarta y 2 ternas y selecciona la carta de descarte.',
    FORMA_APUNTADO_MESSAGE: 'Forma 1 cuarta + 2 ternas, o 3 ternas + 1 sobrante (< 5 pts), y selecciona la carta de descarte.',
    // Avisos de eventos de la partida (sala pública).
    TOCASTE_MESSAGE: 'Tocaste: los demás juegan un último turno antes de liquidar la ronda.',
    JUGADOR_TOCO_MESSAGE: 'Un jugador tocó: te queda un último turno en esta ronda.',
    RONDA_INICIADA_MESSAGE: 'La ronda terminó y se repartió una nueva.',
};