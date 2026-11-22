/**
 * Plug-in `@apuntado/plugin-apuntado` (ADR-03): modalidad Apuntado a 101.
 *
 * - Partida de varias rondas con marcador acumulado.
 * - Cierres: 4-3-3 (1 cuarta + 2 ternas + 1 descarte) y tocar (3 ternas + 1 sobrante de
 *   menos de 5 puntos + 1 descarte). Tocar da una ronda extra a los demás jugadores.
 * - Al liquidar, cada rival suma los puntos de sus cartas no combinadas.
 * - Un jugador queda eliminado al llegar a 101 puntos o más; gana quien queda solo o
 *   quien baja a -51 puntos o menos.
 *
 * Los umbrales son parámetros del plug-in; el núcleo no los conoce. Solo depende del
 * contrato y del evaluador de manos (FF-02).
 */
import {
	ACEPTADO,
	ConfiguracionReparto,
	DescriptorRegla,
	Desenlace,
	EfectoCierre,
	LiquidacionRonda,
	ManoDeclarada,
	ManoRival,
	Marcador,
	ReglaJuegoPlugin,
	ResultadoValidacion,
	TipoCierre,
	rechazo,
} from '../../src/reglas/contrato/regla-juego.plugin';
import { EvaluadorManos, IHandEvaluator } from '../../src/reglas/evaluador/evaluador-manos';

/** Parámetros numéricos de la modalidad (PS). */
export interface ParametrosApuntado {
	/** Puntaje desde el cual un jugador queda eliminado. */
	readonly limiteEliminacion: number;
	/** Puntaje con el cual un jugador gana la partida. */
	readonly limiteVictoria: number;
	/** La sobrante de tocar debe valer estrictamente menos que este umbral. */
	readonly umbralTocar: number;
	/** Puntos que se restan a quien cierra con 4-3-3. */
	readonly bonificacionCierre: number;
	/** Puntos que se suman a quien declara un cierre inválido. */
	readonly castigoCierreFalso: number;
}

/** Valores por defecto de la modalidad. */
export const PARAMETROS_APUNTADO: ParametrosApuntado = {
	limiteEliminacion: 101,
	limiteVictoria: -51,
	umbralTocar: 5,
	bonificacionCierre: 10,
	castigoCierreFalso: 3,
};

/**
 * Regla de la modalidad Apuntado (en el E1: `ReglaApuntado101`).
 * @implements {ReglaJuegoPlugin}
 */
export class ReglaApuntadoPlugin implements ReglaJuegoPlugin {
	readonly descriptor: DescriptorRegla = {
		id: 'apuntado',
		nombre: 'Apuntado a 101',
		version: '1.0.0',
		versionContrato: '1.0.0',
		multironda: true,
	};

	private readonly parametros: ParametrosApuntado;

	/**
	 * @param {Partial<ParametrosApuntado>} parametros Parámetros que reemplazan los valores por defecto.
	 * @param {IHandEvaluator} evaluador Evaluador de combinaciones (por defecto, escalera con vuelta).
	 */
	constructor(
		parametros: Partial<ParametrosApuntado> = {},
		private readonly evaluador: IHandEvaluator = new EvaluadorManos(),
	) {
		this.parametros = { ...PARAMETROS_APUNTADO, ...parametros };
	}

	configuracionReparto(): ConfiguracionReparto {
		return { cartasPorJugador: 10, cartasJugadorInicial: 11 };
	}

	cierresPermitidos(): ReadonlyArray<TipoCierre> {
		return ['GANAR_4_3_3', 'TOCAR'];
	}

	validarCierre(mano: ManoDeclarada, tipo: TipoCierre): ResultadoValidacion {
		if (!this.cierresPermitidos().includes(tipo)) return rechazo(`Cierre no permitido: ${tipo}.`);
		if (!mano.descarte) return rechazo('El cierre requiere una carta de descarte.');
		return tipo === 'TOCAR' ? this.validarTocar(mano) : this.validarCuartaYDosTernas(mano);
	}

	/**
	 * Cierre válido con 4-3-3: termina la ronda y bonifica. Tocar: ronda extra para los demás.
	 * Cierre inválido: castigo y la ronda sigue.
	 */
	efectoCierre(resultado: ResultadoValidacion, tipo: TipoCierre): EfectoCierre {
		if (!resultado.esValido) return { terminaRonda: false, rondaExtra: false, ajustePuntos: this.parametros.castigoCierreFalso };
		if (tipo === 'TOCAR') return { terminaRonda: false, rondaExtra: true, ajustePuntos: 0 };
		return { terminaRonda: true, rondaExtra: false, ajustePuntos: -this.parametros.bonificacionCierre };
	}

	/** Cada rival suma los puntos de los grupos que no combinan y de sus sobrantes. */
	liquidarRonda(manos: ReadonlyArray<ManoRival>): LiquidacionRonda {
		return {
			penalizaciones: Object.fromEntries(
				manos.map((m) => [m.jugadorId, this.evaluador.puntosNoCombinados(m.grupos, m.sobrantes)]),
			),
		};
	}

	/** Elimina a quien llega al límite y termina la partida si queda un jugador o alguien llega a la victoria. */
	evaluarDesenlace(marcador: Marcador): Desenlace {
		const ids = Object.keys(marcador);
		const eliminados = ids.filter((id) => marcador[id] >= this.parametros.limiteEliminacion);
		const activos = ids.filter((id) => !eliminados.includes(id));
		const ganadorPorPuntos = activos.find((id) => marcador[id] <= this.parametros.limiteVictoria);
		if (ganadorPorPuntos) return { terminada: true, ganadorId: ganadorPorPuntos, eliminados };
		if (activos.length <= 1) return { terminada: true, ganadorId: activos[0], eliminados };
		return { terminada: false, eliminados };
	}

	private validarCuartaYDosTernas(mano: ManoDeclarada): ResultadoValidacion {
		if (mano.sobrantes.length > 0) return rechazo('El cierre 4-3-3 no admite cartas sobrantes.');
		if (!this.evaluador.esCuartaYDosTernas(mano.grupos)) return rechazo('Se requieren 1 cuarta y 2 ternas válidas.');
		return ACEPTADO;
	}

	private validarTocar(mano: ManoDeclarada): ResultadoValidacion {
		if (!this.evaluador.sonTresTernas(mano.grupos)) return rechazo('Tocar requiere 3 ternas válidas.');
		if (mano.sobrantes.length !== 1) return rechazo('Tocar requiere exactamente una carta sobrante.');
		if (this.evaluador.puntos(mano.sobrantes) >= this.parametros.umbralTocar) {
			return rechazo(`La sobrante debe valer menos de ${this.parametros.umbralTocar} puntos.`);
		}
		return ACEPTADO;
	}
}
