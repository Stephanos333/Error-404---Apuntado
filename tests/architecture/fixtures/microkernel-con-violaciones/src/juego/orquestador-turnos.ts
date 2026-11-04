// VIOLACIÓN intencional: el núcleo instancia un plug-in concreto en lugar de usar el contrato.
import { ReglaClasica } from '../../plugins/clasica/regla-clasica';

export class OrquestadorTurnos {
	private readonly regla = new ReglaClasica();
	declararCierre(grupos: string[][]): boolean {
		return this.regla.validarCierre(grupos).esValido;
	}
}
