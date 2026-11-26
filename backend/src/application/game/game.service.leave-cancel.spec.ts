import { GameService } from './game.service';
import { UserId } from '../../domain/user/user-id';
import { User, UserDTO } from '../../domain/user/user';
import { UserStatusConstants } from '../../domain/user/user-status.constants';
import { Game, GameDTO } from '../../domain/game/game';
import { GameStatusConstants } from '../../domain/game/game-status.constants';
import { Player, PlayerDTO } from '../../domain/player/player';
import { PlayerStatusConstants } from '../../domain/player/player-status.constants';

import { UserIconConstants } from '../../domain/user/user-icon.constants';

describe('GameService.leaveOrCancel (Architectural adjustment 1 - Lifecycle and cancellation)', () => {
	let service: GameService;
	let mockUserService: any;
	let mockPlayerService: any;
	let mockEventBus: any;
	let mockRuleRegistry: any;
	let mockModel: any;

	const UUID_USER_1 = '11111111-1111-4111-8111-111111111111';
	const UUID_USER_2 = '22222222-2222-4222-8222-222222222222';
	const UUID_GAME_1 = '33333333-3333-4333-8333-333333333333';
	const UUID_PLAYER_1 = '44444444-4444-4444-8444-444444444444';
	const UUID_PLAYER_2 = '55555555-5555-4555-8555-555555555555';
	const UUID_DESIGN_1 = '66666666-6666-4666-8666-666666666666';

	const createUser = (userId: string, status = UserStatusConstants.PLAYING): User => {
		const dto: UserDTO = {
			userId,
			password: 'hashedPassword123',
			status,
			username: `user_${userId.substring(0, 4)}`,
			icon: UserIconConstants.ICON1,
			currentDesignId: UUID_DESIGN_1,
			currentDesignName: 'Design 1',
			tokens: 100,
			cardDesigns: [UUID_DESIGN_1],
		};
		return User.fromDTO(dto);
	};

	const createGame = (
		gameId: string,
		creatorId: string,
		options: Partial<GameDTO> = {},
	): Game => {
		const dto: GameDTO = {
			gameId,
			creatorId,
			hostId: creatorId,
			status: GameStatusConstants.WAITING_PLAYERS,
			name: 'Test room',
			requiredPlayers: 4,
			currentPlayers: 2,
			betByPlayer: 10,
			isPublic: true,
			wasInitiated: false,
			...options,
		};
		return Game.fromDTO(dto);
	};

	const createPlayer = async (playerId: string, gameId: string, userId: string): Promise<Player> => {
		const dto: PlayerDTO = {
			playerId,
			gameId,
			userId,
			status: PlayerStatusConstants.WAITING_GAME,
			isActive: true,
			triedToWin: false,
		};
		return await Player.fromDTO(dto);
	};

	beforeEach(() => {
		mockUserService = {
			getById: jest.fn(),
			update: jest.fn().mockResolvedValue(undefined),
		};
		mockPlayerService = {
			getActiveByUserId: jest.fn(),
			getByGame: jest.fn(),
			delete: jest.fn().mockResolvedValue(undefined),
			deleteByGame: jest.fn().mockResolvedValue(undefined),
		};
		mockEventBus = { publish: jest.fn() };
		mockRuleRegistry = { get: jest.fn() };
		mockModel = {
			findOne: jest.fn(),
			findOneAndUpdate: jest.fn(),
			deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
		};

		service = new GameService(
			mockUserService,
			mockPlayerService,
			mockEventBus,
			mockRuleRegistry,
			mockModel,
		);
	});

	it('releases a user in PLAYING status who has no active Player record (self-recovery)', async () => {
		const userId = new UserId(UUID_USER_1);
		const user = createUser(UUID_USER_1, UserStatusConstants.PLAYING);

		mockUserService.getById.mockResolvedValue(user);
		mockPlayerService.getActiveByUserId.mockResolvedValue(undefined);

		const result = await service.leaveOrCancel(userId);

		expect(result.message).toBe('User released successfully.');
		expect(user.status.is(UserStatusConstants.ACTIVE)).toBe(true);
		expect(mockUserService.update).toHaveBeenCalledWith(user);
	});

	it('cancels the whole room if the requester is the host', async () => {
		const hostId = new UserId(UUID_USER_1);
		const hostUser = createUser(UUID_USER_1, UserStatusConstants.PLAYING);
		const guestUser = createUser(UUID_USER_2, UserStatusConstants.PLAYING);

		const game = createGame(UUID_GAME_1, UUID_USER_1);
		const hostPlayer = await createPlayer(UUID_PLAYER_1, UUID_GAME_1, UUID_USER_1);
		const guestPlayer = await createPlayer(UUID_PLAYER_2, UUID_GAME_1, UUID_USER_2);

		mockUserService.getById.mockImplementation((id: UserId) => {
			if (id.toString() === UUID_USER_1) return Promise.resolve(hostUser);
			return Promise.resolve(guestUser);
		});
		mockPlayerService.getActiveByUserId.mockResolvedValue(hostPlayer);
		mockModel.findOne.mockResolvedValue(game.toDTO());
		mockPlayerService.getByGame.mockResolvedValue([hostPlayer, guestPlayer]);

		const result = await service.leaveOrCancel(hostId);

		expect(result.message).toBe('Match cancelled or left successfully.');
		expect(hostUser.status.is(UserStatusConstants.ACTIVE)).toBe(true);
		expect(guestUser.status.is(UserStatusConstants.ACTIVE)).toBe(true);
		expect(mockPlayerService.deleteByGame).toHaveBeenCalledWith(game.gameId);
		expect(mockModel.deleteOne).toHaveBeenCalledWith({ gameId: UUID_GAME_1 });
	});

	it('removes only the guest from the room without cancelling it when the one leaving is not the host', async () => {
		const guestId = new UserId(UUID_USER_2);
		const guestUser = createUser(UUID_USER_2, UserStatusConstants.PLAYING);

		const game = createGame(UUID_GAME_1, UUID_USER_1, { currentPlayers: 2 });
		const guestPlayer = await createPlayer(UUID_PLAYER_2, UUID_GAME_1, UUID_USER_2);

		mockUserService.getById.mockResolvedValue(guestUser);
		mockPlayerService.getActiveByUserId.mockResolvedValue(guestPlayer);
		mockModel.findOne.mockResolvedValue(game.toDTO());
		mockModel.findOneAndUpdate.mockResolvedValue(game.toDTO());

		const result = await service.leaveOrCancel(guestId);

		expect(result.message).toBe('Match cancelled or left successfully.');
		expect(guestUser.status.is(UserStatusConstants.ACTIVE)).toBe(true);
		expect(mockPlayerService.delete).toHaveBeenCalledWith(guestPlayer.playerId);
		expect(mockModel.deleteOne).not.toHaveBeenCalled();
	});
});
