import { GameId } from '../../domain/game/game-id';
import { PipelineStage } from 'mongoose';

/**
 * Class that holds every query used to access
 * the players collection.
 * @class
 * @abstract
 */
export abstract class PlayerQueries {

	/**
	 * Builds the query that fetches every player of a game
	 * with the information of their users.
	 * @param {GameId} gameId The requested game.
	 * @returns {Array<PipelineStage>} The built query.
	 */
	static getWithUserByGame = (gameId: GameId): Array<PipelineStage> => {
		return [
			{
				'$match': {
					'gameId': gameId.toString(),
					'isActive': true,
				},
			}, {
				'$lookup': {
					'from': 'users',
					'localField': 'userId',
					'foreignField': 'userId',
					'as': 'user',
				},
			}, {
				'$unwind': {
					'path': '$user',
					'preserveNullAndEmptyArrays': false,
				},
			}, {
				'$lookup': {
					'from': 'card-designs',
					'localField': 'user.currentDesignId',
					'foreignField': 'cardDesignId',
					'as': 'cardDesign',
				},
			}, {
				'$unwind': {
					'path': '$cardDesign',
					'preserveNullAndEmptyArrays': false,
				},
			}, {
				'$project': {
					'playerId': '$playerId',
					'userId': '$userId',
					'username': '$user.username',
					'icon': '$user.icon',
					'status': '$status',
					'position': '$position',
					'score': '$score',
					'isActive': '$isActive',
					'cardDesignId': '$cardDesign.cardDesignId',
					'cardDesignName': '$cardDesign.name',
				},
			},
		];
	};
}