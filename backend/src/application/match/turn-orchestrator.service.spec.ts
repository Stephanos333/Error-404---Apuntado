/**
 * ADR-05 compliance: "if save() fails, NO event is published" (persist before
 * notifying). The orchestrator is tested with persistence doubles and a real plug-in.
 */
import { Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Model } from 'mongoose';
import { TurnOrchestrator } from './turn-orchestrator.service';
import { toRecord } from './match.mapper';
import { MatchRepository } from '../../database/match.repository';
import { TokenLedgerRepository } from '../../database/token-ledger.repository';
import { UnitOfWork } from '../../database/unit-of-work';
import { GameRecord, PlayerRecord, UserRecord } from '../../database/database.records';
import { RuleRegistry } from '../../rules/registry/rule-registry';
import { createMatch } from '../../domain/match/match-commands';
import { Match } from '../../domain/match/match';
import { ApuntadoRulePlugin } from '../../../plugins/apuntado';
import { WINNING_CLOSE, WINNING_HAND, TEST_PARAMETERS, shufflerWithFirst } from '../../../test/utils/match.fixtures';

const shuffler = shufflerWithFirst(WINNING_HAND);
const rule = new ApuntadoRulePlugin();

function initialMatch(): Match {
	return createMatch(
		{
			id: '0000000000000000000000a1',
			invitationCode: 'K7P2QX',
			name: 'Table',
			hostId: '000000000000000000000101',
			settings: {
				mode: 'apuntado',
				plugin: { id: 'apuntado', version: '1.0.0' },
				capacity: 2,
				betPerPlayer: 20,
				visibility: 'PUBLIC',
				runType: 'WITH_WRAP',
				jokersEnabled: false,
				rebuyEnabled: false,
				negativeVictoryEnabled: true,
				parameters: TEST_PARAMETERS,
			},
			players: [
				{ playerId: 'u1', userId: '000000000000000000000101', username: 'u1', position: 1 },
				{ playerId: 'u2', userId: '000000000000000000000102', username: 'u2', position: 2 },
			],
			contributions: [],
			now: new Date(),
		},
		rule.dealSettings(),
		shuffler,
	).match;
}

function orchestrator(applyUpdate: jest.Mock, publish: jest.Mock): TurnOrchestrator {
	const match = initialMatch();
	const matches = { findById: jest.fn().mockResolvedValue(toRecord(match)), updateIfMatches: applyUpdate } as unknown as MatchRepository;
	const registry = new RuleRegistry();
	registry.register(rule);
	return new TurnOrchestrator(
		matches,
		{} as TokenLedgerRepository,
		{} as UnitOfWork,
		registry,
		{ publish } as unknown as EventBus,
		shuffler,
		TEST_PARAMETERS,
		{} as Model<UserRecord>,
		{} as Model<GameRecord>,
		{} as Model<PlayerRecord>,
	);
}

const command = { roomId: 'room-1', matchId: '0000000000000000000000a1', userId: 'u1', version: 0, commandId: 'c-1' };

describe('TurnOrchestrator: persist before notifying', () => {
	beforeAll(() => Logger.overrideLogger(false));

	it('publishes the events only after a confirmed write', async () => {
		const publish = jest.fn();
		const result = await orchestrator(jest.fn().mockResolvedValue(true), publish).attemptClose(
			command, 'WIN_4_3_3', WINNING_CLOSE.groups, WINNING_CLOSE.discard,
		);
		expect(result.applied).toBe(true);
		expect(result.match.version).toBe(1);
		expect(publish).toHaveBeenCalledTimes(1);
	});

	it('if save() fails no event is published', async () => {
		const publish = jest.fn();
		const failure = jest.fn().mockRejectedValue(new Error('database unavailable'));
		await expect(orchestrator(failure, publish).discard(command, 10)).rejects.toThrow('database unavailable');
		expect(publish).not.toHaveBeenCalled();
	});

	it('if another command won the race it answers with a controlled error and publishes nothing', async () => {
		const publish = jest.fn();
		const noMatch = jest.fn().mockResolvedValue(false);
		await expect(orchestrator(noMatch, publish).discard(command, 10)).rejects.toThrow('STALE_VERSION');
		expect(publish).not.toHaveBeenCalled();
	});

	it('a resend of an already applied commandId neither writes nor publishes', async () => {
		const publish = jest.fn();
		const applyUpdate = jest.fn();
		const match = { ...initialMatch(), recentCommands: ['c-1'] };
		const service = orchestrator(applyUpdate, publish);
		(service as unknown as { matches: { findById: jest.Mock } }).matches.findById.mockResolvedValue(toRecord(match));
		const result = await service.discard(command, 10);
		expect(result.applied).toBe(false);
		expect(applyUpdate).not.toHaveBeenCalled();
		expect(publish).not.toHaveBeenCalled();
	});
});
