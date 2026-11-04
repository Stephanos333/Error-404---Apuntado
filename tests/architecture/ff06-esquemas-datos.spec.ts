/**
 * FF-06 · Gobernanza de la arquitectura de información (ADR-04).
 *
 * Los validadores `$jsonSchema` de MongoDB (docs/schemas) deben compilar y aceptar los
 * documentos de ejemplo de cada modalidad, y deben RECHAZAR estados inválidos del dominio
 * (p. ej. una Clásica con reenganche, una mano con más de 11 cartas o un hash SHA-256). Así el esquema que se
 * despliega en la base no se desalinea del modelo documentado.
 */
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import { RAIZ_REPO } from './arquitectura.config';

const DIR = path.join(RAIZ_REPO, 'docs', 'schemas');
const BSON_A_JSON: Record<string, string> = {
	objectId: 'string', date: 'string', int: 'integer', long: 'integer', double: 'number',
	decimal: 'number', bool: 'boolean', string: 'string', object: 'object', array: 'array', null: 'null',
};

/** Convierte el dialecto `$jsonSchema` de MongoDB (bsonType) a JSON Schema estándar. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertir(esquema: any): any {
	if (Array.isArray(esquema)) return esquema.map(convertir);
	if (!esquema || typeof esquema !== 'object') return esquema;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const salida: any = {};
	for (const [clave, valor] of Object.entries(esquema)) {
		if (clave !== 'bsonType') {
			salida[clave] = convertir(valor);
			continue;
		}
		const tipos = (Array.isArray(valor) ? valor : [valor]) as string[];
		const json = [...new Set(tipos.map((t) => BSON_A_JSON[t] ?? `desconocido:${t}`))];
		salida.type = json.length === 1 ? json[0] : json;
		if (tipos.length === 1 && tipos[0] === 'objectId') salida.pattern = '^[0-9a-f]{24}$';
	}
	return salida;
}

/** Convierte MongoDB Extended JSON ({$oid}, {$date}) a valores JSON simples. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function desdeExtendedJson(valor: any): any {
	if (Array.isArray(valor)) return valor.map(desdeExtendedJson);
	if (!valor || typeof valor !== 'object') return valor;
	if ('$oid' in valor) return valor.$oid;
	if ('$date' in valor) return valor.$date;
	return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, desdeExtendedJson(v)]));
}

const leer = (archivo: string) => JSON.parse(fs.readFileSync(path.join(DIR, archivo), 'utf8'));
const ejemplo = (nombre: string) => desdeExtendedJson(leer(path.join('ejemplos', nombre)));

describe('FF-06 Esquemas de datos (JSON Schema de MongoDB)', () => {
	const ajv = new Ajv({ strict: false, allErrors: true });
	addFormats(ajv);
	const validadores: Record<string, ValidateFunction> = {};

	const archivos = fs.readdirSync(DIR).filter((f) => f.endsWith('.schema.json'));
	it.each(archivos)('el validador %s es un $jsonSchema que compila', (archivo) => {
		const esquema = leer(archivo);
		expect(esquema).toHaveProperty('$jsonSchema');
		validadores[archivo.replace('.schema.json', '')] = ajv.compile(convertir(esquema.$jsonSchema));
	});

	it.each([
		['partidas', 'partida-apuntado-en-juego.json'],
		['partidas', 'partida-clasica-finalizada.json'],
		['jugadas', 'jugadas-ronda-bucket.json'],
		['usuarios', 'usuario-jugador.json'],
	])('acepta el ejemplo válido de %s: %s', (coleccion, archivo) => {
		const valida = validadores[coleccion];
		expect(valida(ejemplo(archivo))).toBe(true);
	});

	it('rechaza una partida Clásica con reenganche activo (la Clásica es de una sola ronda)', () => {
		const doc = ejemplo('partida-clasica-finalizada.json');
		doc.configuracion.reengancheActivo = true;
		expect(validadores.partidas(doc)).toBe(false);
	});

	it('rechaza contraseñas que no usen argon2id (p. ej. SHA-256 sin sal del prototipo, R12)', () => {
		const doc = ejemplo('usuario-jugador.json');
		doc.hashContrasena = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
		expect(validadores.usuarios(doc)).toBe(false);
	});

	it('rechaza una mano con más de 11 cartas', () => {
		const doc = ejemplo('partida-apuntado-en-juego.json');
		doc.rondaActual.manos[0].cartas.push(doc.rondaActual.mazo[0]);
		expect(validadores.partidas(doc)).toBe(false);
	});
});
