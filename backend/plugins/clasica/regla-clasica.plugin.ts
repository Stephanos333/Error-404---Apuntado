/**
 * Plug-in `@apuntado/plugin-clasica` (ADR-03): modalidad Clásica 4-3-3.
 *
 * - Partida atómica de una sola ronda.
 * - Único cierre: 1 cuarta + 2 ternas + 1 descarte.
 * - Sin marcador histórico: quien cierra gana la partida y los demás quedan fuera.
 *
 * Solo depende del contrato y del evaluador de manos (FF-02).
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

/**
 * Regla de la modalidad Clásica (en el E1: `ReglaClasicaCuartaTerna`).
 * @implements {ReglaJuegoPlugin}
 */
export class ReglaClasicaPlugin implements ReglaJuegoPlugin {
	readonly descriptor: DescriptorRegla = {
		id: 'clasica',
		nombre: 'Clásica 4-3-3',
		version: '1.0.0',
		versionContrato: '1.0.0',
		multironda: false,
	};

	/**
	 * @param {IHandEvaluator} evaluador Evaluador de combinaciones (por defecto, escalera con vuelta).
	 */
	constructor(private readonly evaluador: IHandEvaluator = new EvaluadorManos()) {}

	configuracionReparto(): ConfiguracionReparto {
		return { cartasPorJugador: 10, cartasJugadorInicial: 11 };
	}

	cierresPermitidos(): ReadonlyArray<TipoCierre> {
		return ['GANAR_4_3_3'];
	}

	validarCierre(mano: ManoDeclarada, tipo: TipoCierre): ResultadoValidacion {
		if (!this.cierresPermitidos().includes(tipo)) return rechazo('La modalidad Clásica solo admite el cierre 4-3-3.');
		if (!mano.descarte) return rechazo('El cierre requiere una carta de descarte.');
		if (mano.sobrantes.length > 0) return rechazo('El cierre 4-3-3 no admite cartas sobrantes.');
		if (!this.evaluador.esCuartaYDosTernas(mano.grupos)) return rechazo('Se requieren 1 cuarta y 2 ternas válidas.');
		return ACEPTADO;
	}

	/** Un cierre válido termina la ronda; no hay puntos porque no hay marcador. */
	efectoCierre(resultado: ResultadoValidacion): EfectoCierre {
		return { terminaRonda: resultado.esValido, rondaExtra: false, ajustePuntos: 0 };
	}

	/** Sin marcador histórico: la ronda no genera penalizaciones. */
	liquidarRonda(manos: ReadonlyArray<ManoRival>): LiquidacionRonda {
		return { penalizaciones: Object.fromEntries(manos.map((m) => [m.jugadorId, 0])) };
	}

	/** Una sola ronda: quien cierra gana y la partida termina. */
	evaluarDesenlace(marcador: Marcador, cerradorId: string): Desenlace {
		return {
			terminada: true,
			ganadorId: cerradorId,
			eliminados: Object.keys(marcador).filter((id) => id !== cerradorId),
		};
	}
}
