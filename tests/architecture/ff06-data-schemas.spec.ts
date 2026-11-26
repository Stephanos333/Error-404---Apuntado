/**
 * FF-06 · Governance of the information architecture (ADR-04).
 *
 * The MongoDB `$jsonSchema` validators (docs/schemas) must compile and accept the example
 * documents of each mode, and they must REJECT invalid domain states (e.g. a Classic match
 * with rebuy, a hand with more than 11 cards or a SHA-256 hash). That way the schema deployed
 * to the database does not drift from the documented model.
 */
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from './architecture.config';

const DIR = path.join(REPO_ROOT, 'docs', 'schemas');
const BSON_TO_JSON: Record<string, string> = {
	objectId: 'string', date: 'string', int: 'integer', long: 'integer', double: 'number',
	decimal: 'number', bool: 'boolean', string: 'string', object: 'object', array: 'array', null: 'null',
};

/** Converts the MongoDB `$jsonSchema` dialect (bsonType) into standard JSON Schema. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convert(schema: any): any {
	if (Array.isArray(schema)) return schema.map(convert);
	if (!schema || typeof schema !== 'object') return schema;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const output: any = {};
	for (const [key, value] of Object.entries(schema)) {
		if (key !== 'bsonType') {
			output[key] = convert(value);
			continue;
		}
		const types = (Array.isArray(value) ? value : [value]) as string[];
		const json = [...new Set(types.map((t) => BSON_TO_JSON[t] ?? `unknown:${t}`))];
		output.type = json.length === 1 ? json[0] : json;
		if (types.length === 1 && types[0] === 'objectId') output.pattern = '^[0-9a-f]{24}$';
	}
	return output;
}

/** Converts MongoDB Extended JSON ({$oid}, {$date}) into plain JSON values. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromExtendedJson(value: any): any {
	if (Array.isArray(value)) return value.map(fromExtendedJson);
	if (!value || typeof value !== 'object') return value;
	if ('$oid' in value) return value.$oid;
	if ('$date' in value) return value.$date;
	return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fromExtendedJson(v)]));
}

const read = (file: string) => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
const example = (name: string) => fromExtendedJson(read(path.join('examples', name)));

describe('FF-06 Data schemas (MongoDB JSON Schema)', () => {
	const ajv = new Ajv({ strict: false, allErrors: true });
	addFormats(ajv);
	const validators: Record<string, ValidateFunction> = {};

	const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.schema.json'));
	it.each(files)('the %s validator is a $jsonSchema that compiles', (file) => {
		const schema = read(file);
		expect(schema).toHaveProperty('$jsonSchema');
		validators[file.replace('.schema.json', '')] = ajv.compile(convert(schema.$jsonSchema));
	});

	it.each([
		['matches', 'match-apuntado-in-progress.json'],
		['matches', 'match-classic-finished.json'],
		['plays', 'plays-round-bucket.json'],
		['user_accounts', 'user-account-player.json'],
	])('accepts the valid %s example: %s', (collection, file) => {
		const validate = validators[collection];
		expect(validate(example(file))).toBe(true);
	});

	it('rejects a Classic match with rebuy enabled (Classic has a single round)', () => {
		const doc = example('match-classic-finished.json');
		doc.settings.rebuyEnabled = true;
		expect(validators.matches(doc)).toBe(false);
	});

	it('rejects passwords that do not use argon2id (e.g. the prototype unsalted SHA-256, R12)', () => {
		const doc = example('user-account-player.json');
		doc.passwordHash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
		expect(validators.user_accounts(doc)).toBe(false);
	});

	it('rejects a hand with more than 11 cards', () => {
		const doc = example('match-apuntado-in-progress.json');
		doc.currentRound.hands[0].cards.push(doc.currentRound.deck[0]);
		expect(validators.matches(doc)).toBe(false);
	});
});
