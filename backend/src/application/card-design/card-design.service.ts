import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Model, PipelineStage } from 'mongoose';
import { CardDesignDocument } from '../../database/card-design.schema';
import { CardDesign, CardDesignDTO } from '../../domain/card-design/card-design';
import { DefaultCardDesignNotFoundException } from '../../domain/card-design/exceptions/default-card-design-not-found.exception';
import { DatabaseConstants } from '../../database/database.constants';
import { CardDesignId } from '../../card/card-design-id';
import { CardDesignNotFoundException } from '../../domain/card-design/exceptions/card-design-not-found.exception';
import { CardDesignQueries } from './card-design.queries';

/**
 * Class with the services to interact with the
 * card designs of the system.
 * @class
 */
@Injectable()
export class CardDesignService implements OnApplicationBootstrap {

	private readonly logger: Logger = new Logger(CardDesignService.name);

	/**
	 * @param {Model<CardDesignDocument>} model Model to interact with
	 * the card designs database.
	 */
	constructor(
		@Inject(DatabaseConstants.CARD_DESIGN_PROVIDER) private readonly model: Model<CardDesignDocument>,
	) {
	}

	/**
	 * If the database is new and has no design catalog, the 5 initial designs
	 * required by the system are seeded automatically.
	 */
	async onApplicationBootstrap(): Promise<void> {
		try {
			const count = await this.model.countDocuments();
			if (count === 0) {
				this.logger.log('Empty card-designs collection. Initializing the default catalog...');
				const now = new Date();
				const designs = [
					{ cardDesignId: '5f0c6c2e-0a8e-4b3e-9a51-2f1d3c4b5a60', name: 'DEFAULT', isDefault: true, isFree: true, isActive: true, createdAt: now, updatedAt: now },
					{ cardDesignId: '7a1d2e3f-4b5c-4d6e-8f70-81a2b3c4d5e6', name: 'BLUE', isDefault: false, isFree: true, isActive: true, createdAt: now, updatedAt: now },
					{ cardDesignId: '8b2e3f40-5c6d-4e7f-9a81-92b3c4d5e6f7', name: 'RED', isDefault: false, isFree: true, isActive: true, createdAt: now, updatedAt: now },
					{ cardDesignId: '9c3f4051-6d7e-4f80-8b92-a3c4d5e6f708', name: 'RETRO', isDefault: false, isFree: false, isActive: true, price: 50, createdAt: now, updatedAt: now },
					{ cardDesignId: 'ad405162-7e8f-4091-9ca3-b4d5e6f70819', name: 'NIGHT_VISION', isDefault: false, isFree: false, isActive: true, price: 100, createdAt: now, updatedAt: now },
				];
				await this.model.insertMany(designs);
				this.logger.log('Card design catalog initialized successfully.');
			}
		} catch (error) {
			this.logger.warn(`Could not check or seed card-designs: ${error?.message || error}`);
		}
	}

	/**
	 * Finds every available card design and whether it can be selected.
	 * @param {Set<string>} userCardDesigns The user's card designs.
	 * @returns {Promise<Array<{ cardDesign: CardDesign, canSelect: boolean }>>} The
	 * designs found.
	 */
	async getAvailable(userCardDesigns: Set<string>): Promise<Array<{ cardDesign: CardDesign, canSelect: boolean }>> {
		this.logger.log(`[${this.getAvailable.name}] INIT ::`);
		const query: Array<PipelineStage> = CardDesignQueries.getCardDesignsAvailable(userCardDesigns);
		const aggregateResponse: Array<CardDesignDTO & { canSelect: boolean }> = await this.model.aggregate(query);
		const mapped: Array<{
			cardDesign: CardDesign,
			canSelect: boolean
		}> = await Promise.all(aggregateResponse.map(async (cd) => {
			return {
				cardDesign: CardDesign.fromDTO(cd),
				canSelect: cd.canSelect,
			};
		}));
		this.logger.log(`[${this.getAvailable.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Finds an active card design by ID.
	 * @param {CardDesignId} cardDesignId The requested card design.
	 * @param {boolean} [throwExceptionIfNotFound=true] Whether an exception must be thrown
	 * when the requested design does not exist.
	 * @returns {CardDesign | undefined} The requested design; when
	 * throwExceptionIfNotFound=false and the design does not exist, undefined.
	 * @throws {CardDesignNotFoundException} When the requested card design
	 * is not found.
	 */
	async getActiveById(cardDesignId: CardDesignId, throwExceptionIfNotFound: boolean = true): Promise<CardDesign | undefined> {
		this.logger.log(`[${this.getActiveById.name}] INIT :: cardDesignId: ${cardDesignId.toString()}`);
		const found: CardDesignDTO = await this.model.findOne({
			isActive: true,
			cardDesignId: cardDesignId.toString(),
		});
		const mapped: CardDesign = found ? CardDesign.fromDTO(found) : undefined;
		if (throwExceptionIfNotFound && !mapped) throw new CardDesignNotFoundException();
		this.logger.log(`[${this.getActiveById.name}] FINISH ::`);
		return mapped;
	}

	/**
	 * Finds the default card design of the system.
	 * @returns {Promise<CardDesign>} The requested design.
	 * @throws {DefaultCardDesignNotFoundException} When the requested card design
	 * is not found.
	 */
	async getDefault(): Promise<CardDesign> {
		this.logger.log(`[${this.getDefault.name}] INIT ::`);
		const found: CardDesignDTO = await this.model.findOne({ isDefault: true, isActive: true });
		const mapped: CardDesign = found ? CardDesign.fromDTO(found) : undefined;
		if (!mapped) throw new DefaultCardDesignNotFoundException();
		this.logger.log(`[${this.getDefault.name}] FINISH ::`);
		return mapped;
	}
}