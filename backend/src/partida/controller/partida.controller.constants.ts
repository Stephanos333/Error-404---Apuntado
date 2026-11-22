/**
 * @enum {string} Constantes de configuración del controlador de la partida (agregado `partidas`).
 * @readonly
 */
export enum PartidaControllerConstants {
	/**
	 * Prefijo de las rutas de la partida.
	 */
	CONTROLLER_PREFIX = 'partidas',
	/**
	 * Tag que agrupa las rutas de la partida en Swagger.
	 */
	CONTROLLER_TAG = 'Partidas',
	/**
	 * Estado de la partida actual del usuario (vista pública + su mano). RF-14, reconexión.
	 */
	ESTADO_URL = 'actual',
	/**
	 * Comando robar.
	 */
	ROBAR_URL = 'actual/comandos/robar',
	/**
	 * Comando descartar (pasa el turno).
	 */
	DESCARTAR_URL = 'actual/comandos/descartar',
	/**
	 * Comando intentar cierre de ronda.
	 */
	CERRAR_URL = 'actual/comandos/cerrar',
}
