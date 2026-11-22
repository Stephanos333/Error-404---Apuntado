import { PlayerQueries } from './player.queries';
import { GameId } from '../../dominio/game/game-id';

describe('PlayerQueries (Ajuste Arquitectural 2 - Consistencia y deduplicación)', () => {
	it('debe incluir el filtro estricto isActive: true en la agregación para no proyectar asientos inactivos', () => {
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

