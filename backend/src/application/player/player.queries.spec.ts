import { PlayerQueries } from './player.queries';
import { GameId } from '../../domain/game/game-id';

describe('PlayerQueries (Architectural adjustment 2 - Consistency and deduplication)', () => {
	it('includes the strict isActive: true filter in the aggregation so inactive seats are not projected', () => {
		const gameId = new GameId('c4f0d49e-efd2-4c19-a927-9356cefc3adf');
		const pipeline = PlayerQueries.getWithUserByGame(gameId);

		expect(pipeline).toBeDefined();
		expect(pipeline.length).toBeGreaterThan(0);

		const matchStage = pipeline[0] as { $match: { gameId: string; isActive: boolean } };
		expect(matchStage.$match).toBeDefined();
		expect(matchStage.$match.gameId).toBe(gameId.toString());
		expect(matchStage.$match.isActive).toBe(true);
	});
});

