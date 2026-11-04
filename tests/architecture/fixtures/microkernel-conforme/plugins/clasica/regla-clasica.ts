import { ReglaJuegoPlugin, ResultadoValidacion, TipoCierre } from '../../src/reglas/contrato/regla-juego.plugin';
import { esCuarta, esTerna } from '../../src/reglas/evaluador/evaluador-mano';

/** Plug-in de la modalidad Clásica: 1 cuarta + 2 ternas + 1 descarte, una sola ronda. */
export class ReglaClasica implements ReglaJuegoPlugin {
	readonly id = 'clasica';
	cierresPermitidos(): TipoCierre[] {
		return ['GANAR_4_3_3'];
	}
	validarCierre(grupos: string[][]): ResultadoValidacion {
		return { esValido: esCuarta(grupos[0]) && esTerna(grupos[1]) && esTerna(grupos[2]) };
	}
}
