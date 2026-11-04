import { ResultadoValidacion, TipoCierre } from '../../src/reglas/contrato/regla-juego.plugin';
import { esTerna } from '../../src/reglas/evaluador/evaluador-mano';
// VIOLACIÓN intencional: un plug-in depende de otro plug-in.
import { ReglaClasica } from '../clasica/regla-clasica';

export class ReglaApuntado extends ReglaClasica {
	readonly id = 'apuntado';
	cierresPermitidos(): TipoCierre[] {
		return ['GANAR_4_3_3', 'TOCAR'];
	}
	validarCierre(grupos: string[][], tipo: TipoCierre = 'GANAR_4_3_3'): ResultadoValidacion {
		if (tipo === 'TOCAR') return { esValido: grupos.slice(0, 3).every(esTerna) };
		return super.validarCierre(grupos);
	}
}
