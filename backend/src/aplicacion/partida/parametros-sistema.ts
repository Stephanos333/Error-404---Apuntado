import { ParametrosPartida } from '../../dominio/partida/partida';

/** Token de inyección de los parámetros del sistema (PS) que se congelan en cada partida. */
export const PARAMETROS_SISTEMA = 'PARAMETROS_SISTEMA';

/**
 * Valores por defecto de los parámetros del sistema (PS-01 a PS-10). La raíz de
 * composición los combina con las variables de entorno y los entrega también al
 * plug-in Apuntado, para que la configuración congelada y la regla coincidan.
 */
export const PARAMETROS_SISTEMA_POR_DEFECTO: ParametrosPartida = {
	limiteEliminacion: 101,
	umbralTocar: 5,
	castigoCierreInvalido: 3,
	bonificacionCierre: -10,
	umbralVictoriaNegativa: -51,
	valorComodin: 0,
	comodinesPorBaraja: 0,
	jugadoresDobleBaraja: 4,
	graciaDesconexionSeg: 120,
	ventanaResultadosSeg: 20,
};
