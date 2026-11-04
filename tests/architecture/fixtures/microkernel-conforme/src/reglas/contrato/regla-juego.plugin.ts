/** Contrato común (Contract Interface) que el núcleo define y los plug-ins implementan. */
export type TipoCierre = 'GANAR_4_3_3' | 'TOCAR';
export interface ResultadoValidacion { esValido: boolean; motivo?: string }
export interface ReglaJuegoPlugin {
	readonly id: string;
	cierresPermitidos(): TipoCierre[];
	validarCierre(grupos: string[][], tipo: TipoCierre): ResultadoValidacion;
}
