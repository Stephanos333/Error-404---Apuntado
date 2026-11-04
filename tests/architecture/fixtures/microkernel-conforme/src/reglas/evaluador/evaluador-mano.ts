/** Evaluador de grupos de cartas compartido por los plug-ins. */
export function esTerna(grupo: string[]): boolean {
	return grupo.length === 3;
}
export function esCuarta(grupo: string[]): boolean {
	return grupo.length === 4;
}
