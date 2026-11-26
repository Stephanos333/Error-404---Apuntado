import { PipelineStage } from 'mongoose';

/**
 * Class that holds every query used to access
 * the card designs collection.
 * @class
 * @abstract
 */
export abstract class CardDesignQueries {

	/**
	 * Builds the query that fetches every available card design.
	 * @param {Set<string>} userCardDesigns The card designs of the requesting user.
	 * @returns {Array<PipelineStage>} The built query.
	 */
	static getCardDesignsAvailable = (userCardDesigns: Set<string>): Array<PipelineStage> => {
		return [
			{
				'$addFields': {
					'canSelect': {
						'$cond': {
							'if': {
								'$or': [
									{
										'$in': [
											'$cardDesignId', Array.from(userCardDesigns),
										],
									},
									{
										'$eq': ['$isFree', true]
									}
								]

							},
							'then': true,
							'else': false,
						},
					},
				},
			},
		];
	};
}