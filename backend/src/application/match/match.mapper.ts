import { Types } from 'mongoose';
import { MatchRecord } from '../../database/database.records';
import { Match } from '../../domain/match/match';

const aObjectId = (hex: string): Types.ObjectId => new Types.ObjectId(hex);

/**
 * Translates the domain match into the persisted document: the hexadecimal
 * identifiers become `ObjectId` (`docs/schemas/matches.schema.json`).
 * @param {Match} match The domain match.
 * @returns {MatchRecord} The document.
 */
export function toRecord(match: Match): MatchRecord {
	return {
		...match,
		_id: aObjectId(match._id),
		hostId: aObjectId(match.hostId),
		settings: { ...match.settings, parameters: { ...match.settings.parameters } },
		players: match.players.map((j) => ({ ...j, userId: aObjectId(j.userId) })),
		pot: {
			total: match.pot.total,
			contributions: match.pot.contributions.map((a) => ({ ...a, userId: aObjectId(a.userId), ledgerEntryId: aObjectId(a.ledgerEntryId) })),
		},
	};
}

/**
 * Translates the persisted document into the domain match.
 * @param {MatchRecord} record The document.
 * @returns {Match} The domain match.
 */
export function toDomain(record: MatchRecord): Match {
	const base = record as unknown as Match;
	return {
		...base,
		_id: record._id.toHexString(),
		hostId: record.hostId.toHexString(),
		players: record.players.map((j) => ({ ...(j as unknown as Match['players'][number]), userId: j.userId.toHexString() })),
		pot: {
			total: record.pot.total,
			contributions: record.pot.contributions.map((a) => ({
				...(a as unknown as Match['pot']['contributions'][number]),
				userId: a.userId.toHexString(),
				ledgerEntryId: a.ledgerEntryId.toHexString(),
			})),
		},
	};
}
