import { ReglaJuegoPlugin } from '../contrato/regla-juego.plugin';
import { PluginIncompatibleError, RegistroReglas, ReglaNoRegistradaError, esVersionCompatible } from './registro-reglas';

/** Stub mínimo del contrato: el registro no conoce ningún plug-in concreto. */
function stub(id: string, sobrescribir: Partial<ReglaJuegoPlugin> = {}): ReglaJuegoPlugin {
	return {
		descriptor: { id, nombre: id, version: '1.0.0', versionContrato: '1.0.0', multironda: false },
		configuracionReparto: () => ({ cartasPorJugador: 10, cartasJugadorInicial: 11 }),
		cierresPermitidos: () => ['GANAR_4_3_3'],
		validarCierre: (mano) => ({ esValido: mano.grupos.length > 0 }),
		efectoCierre: (r) => ({ terminaRonda: r.esValido, rondaExtra: false, ajustePuntos: 0 }),
		liquidarRonda: () => ({ penalizaciones: {} }),
		evaluarDesenlace: () => ({ terminada: false, eliminados: [] }),
		...sobrescribir,
	};
}

describe('RegistroReglas', () => {
	it('entrega la regla por id y usa la primera como predeterminada', () => {
		const registro = new RegistroReglas();
		registro.registrar(stub('a'));
		registro.registrar(stub('b'));
		expect(registro.obtener('b').descriptor.id).toBe('b');
		expect(registro.obtener().descriptor.id).toBe('a');
		expect(registro.ids()).toEqual(['a', 'b']);
	});

	it('respeta la regla marcada como predeterminada', () => {
		const registro = new RegistroReglas();
		registro.registrar(stub('a'));
		registro.registrar(stub('b'), { predeterminada: true });
		expect(registro.predeterminada).toBe('b');
	});

	it('lanza ReglaNoRegistradaError para un id desconocido', () => {
		const registro = new RegistroReglas();
		registro.registrar(stub('a'));
		expect(() => registro.obtener('x')).toThrow(ReglaNoRegistradaError);
		expect(registro.existe('x')).toBe(false);
	});

	it('rechaza un id duplicado', () => {
		const registro = new RegistroReglas();
		registro.registrar(stub('a'));
		expect(() => registro.registrar(stub('a'))).toThrow(PluginIncompatibleError);
	});

	it('rechaza una versión mayor distinta del contrato (fail fast)', () => {
		const incompatible = stub('v2', { descriptor: { ...stub('v2').descriptor, versionContrato: '2.0.0' } });
		expect(() => new RegistroReglas('1.0.0').registrar(incompatible)).toThrow(PluginIncompatibleError);
	});

	it('rechaza un plug-in al que le falta una operación del contrato', () => {
		const incompleto = { ...stub('x'), liquidarRonda: undefined } as unknown as ReglaJuegoPlugin;
		expect(() => new RegistroReglas().registrar(incompleto)).toThrow(/liquidarRonda/);
	});

	it('la prueba de humo rechaza un plug-in que acepta una mano vacía', () => {
		const permisivo = stub('x', { validarCierre: () => ({ esValido: true }) });
		expect(() => new RegistroReglas().registrar(permisivo)).toThrow(/mano vacía/);
	});

	it('compatibilidad semver: misma mayor y menor no superior a la del núcleo', () => {
		expect(esVersionCompatible('1.0.0', '1.2.0')).toBe(true);
		expect(esVersionCompatible('1.3.0', '1.2.0')).toBe(false);
		expect(esVersionCompatible('2.0.0', '1.0.0')).toBe(false);
		expect(esVersionCompatible('x', '1.0.0')).toBe(false);
	});
});
