import { ReglaJuegoPlugin, ResultadoValidacion, TipoCierre } from '../../src/reglas/contrato/regla-juego.plugin';
import { esCuarta, esTerna } from '../../src/reglas/evaluador/evaluador-mano';

/** Plug-in de la modalidad Apuntado: 4-3-3 o tocar (3 ternas + sobrante < 5), conteo a 101. */
export class ReglaApuntado implements ReglaJuegoPlugin {
	readonly id = 'apuntado';
	cierresPermitidos(): TipoCierre[] {
		return ['GANAR_4_3_3', 'TOCAR'];
	}
	validarCierre(grupos: string[][], tipo: TipoCierre): ResultadoValidacion {
		if (tipo === 'TOCAR') return { esValido: grupos.slice(0, 3).every(esTerna) };
		return { esValido: esCuarta(grupos[0]) && esTerna(grupos[1]) && esTerna(grupos[2]) };
	}
}
