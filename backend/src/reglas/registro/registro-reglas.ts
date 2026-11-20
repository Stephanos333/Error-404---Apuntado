/**
 * Registro de plug-ins de reglas (`PluginRegistry`, ADR-03).
 *
 * Valida cada plug-in al registrarlo (forma del contrato, compatibilidad semver y una
 * prueba de humo) y lo entrega al núcleo por su id. El núcleo solo conoce este registro
 * y el contrato, nunca un plug-in concreto (FF-02). Si un plug-in es incompatible el
 * registro lanza un error y la aplicación no arranca (fail fast).
 */
import { OPERACIONES_CONTRATO, ReglaJuegoPlugin, VERSION_CONTRATO } from '../contrato/regla-juego.plugin';

/** Se lanza cuando se pide una regla que no está registrada. */
export class ReglaNoRegistradaError extends Error {
	constructor(public readonly id: string | undefined) {
		super(`La regla "${id}" no está registrada.`);
		this.name = 'ReglaNoRegistradaError';
	}
}

/** Se lanza cuando un plug-in no cumple el contrato o su versión no es compatible. */
export class PluginIncompatibleError extends Error {
	constructor(public readonly id: string | undefined, motivo: string) {
		super(`El plug-in "${id}" es incompatible: ${motivo}`);
		this.name = 'PluginIncompatibleError';
	}
}

/** Partes numéricas de una versión semver `mayor.menor.parche`. */
function partesVersion(version: string): number[] | undefined {
	const coincidencia = /^(\d+)\.(\d+)\.(\d+)/.exec(version ?? '');
	return coincidencia ? coincidencia.slice(1, 4).map(Number) : undefined;
}

/**
 * Un plug-in es compatible si usa la misma versión mayor del contrato y no exige una
 * versión menor más nueva que la del núcleo.
 */
export function esVersionCompatible(versionPlugin: string, versionNucleo: string = VERSION_CONTRATO): boolean {
	const plugin = partesVersion(versionPlugin);
	const nucleo = partesVersion(versionNucleo);
	if (!plugin || !nucleo) return false;
	return plugin[0] === nucleo[0] && plugin[1] <= nucleo[1];
}

/** Opciones de registro. */
export interface OpcionesRegistro {
	/** La regla se usa cuando una partida no tiene regla congelada (partidas anteriores al MVP). */
	predeterminada?: boolean;
}

/**
 * Registro en memoria de las reglas disponibles.
 * @class
 */
export class RegistroReglas {
	private readonly reglas = new Map<string, ReglaJuegoPlugin>();
	private idPredeterminado?: string;

	/**
	 * @param {string} versionNucleo Versión del contrato que ofrece el núcleo.
	 */
	constructor(private readonly versionNucleo: string = VERSION_CONTRATO) {}

	/**
	 * Valida y registra un plug-in. La primera regla registrada es la predeterminada,
	 * salvo que otra se marque explícitamente.
	 * @throws {PluginIncompatibleError} Si el plug-in no cumple el contrato o ya existe.
	 */
	registrar(plugin: ReglaJuegoPlugin, opciones: OpcionesRegistro = {}): void {
		const id = plugin?.descriptor?.id;
		this.validarForma(plugin, id);
		if (!esVersionCompatible(plugin.descriptor.versionContrato, this.versionNucleo)) {
			throw new PluginIncompatibleError(id, `contrato ${plugin.descriptor.versionContrato}, núcleo ${this.versionNucleo}.`);
		}
		if (this.reglas.has(id)) throw new PluginIncompatibleError(id, 'ya hay un plug-in registrado con ese id.');
		this.pruebaDeHumo(plugin, id);
		this.reglas.set(id, plugin);
		if (opciones.predeterminada || !this.idPredeterminado) this.idPredeterminado = id;
	}

	/**
	 * Devuelve la regla con el id indicado, o la predeterminada si no se indica.
	 * @throws {ReglaNoRegistradaError} Si no existe.
	 */
	obtener(id?: string): ReglaJuegoPlugin {
		const clave = id ?? this.idPredeterminado;
		const regla = this.reglas.get(clave);
		if (!regla) throw new ReglaNoRegistradaError(clave);
		return regla;
	}

	/** Determina si hay una regla registrada con el id. */
	existe(id: string): boolean {
		return this.reglas.has(id);
	}

	/** Id de la regla predeterminada. */
	get predeterminada(): string | undefined {
		return this.idPredeterminado;
	}

	/** Ids de las reglas registradas. */
	ids(): string[] {
		return [...this.reglas.keys()];
	}

	/** El plug-in expone el descriptor y todas las operaciones del contrato. */
	private validarForma(plugin: ReglaJuegoPlugin, id: string | undefined): void {
		if (!id) throw new PluginIncompatibleError(id, 'no tiene descriptor con id.');
		const faltantes = OPERACIONES_CONTRATO.filter((op) => typeof plugin[op] !== 'function');
		if (faltantes.length > 0) throw new PluginIncompatibleError(id, `faltan operaciones: ${faltantes.join(', ')}.`);
	}

	/** Prueba de humo: reparto positivo, al menos un cierre y una mano vacía nunca cierra. */
	private pruebaDeHumo(plugin: ReglaJuegoPlugin, id: string): void {
		const { cartasPorJugador, cartasJugadorInicial } = plugin.configuracionReparto();
		if (!(cartasPorJugador > 0 && cartasJugadorInicial >= cartasPorJugador)) {
			throw new PluginIncompatibleError(id, 'la configuración de reparto no es válida.');
		}
		const cierres = plugin.cierresPermitidos();
		if (cierres.length === 0) throw new PluginIncompatibleError(id, 'no declara cierres permitidos.');
		const manoVacia = { grupos: [], sobrantes: [] };
		if (cierres.some((tipo) => plugin.validarCierre(manoVacia, tipo).esValido)) {
			throw new PluginIncompatibleError(id, 'acepta el cierre de una mano vacía.');
		}
	}
}
