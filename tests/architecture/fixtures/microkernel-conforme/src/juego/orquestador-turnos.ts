import { ReglaJuegoPlugin, TipoCierre } from '../reglas/contrato/regla-juego.plugin';

/** El núcleo solo conoce el contrato; recibe la regla desde el registro de plug-ins. */
export class OrquestadorTurnos {
	constructor(private readonly regla: ReglaJuegoPlugin) {}
	declararCierre(grupos: string[][], tipo: TipoCierre): boolean {
		return this.regla.validarCierre(grupos, tipo).esValido;
	}
}
