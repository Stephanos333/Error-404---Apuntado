import { CardDesignId } from '../../card/card-design-id';
import { ApiProperty } from '@nestjs/swagger';
import { DomainBase } from '../../shared/domain.base';

/**
 * Transfer object of
 * a card design.
 * @class
 */
export class CardDesignDTO {
	@ApiProperty() cardDesignId: string;
	@ApiProperty() name: string;
	@ApiProperty() isDefault: boolean;
	@ApiProperty() isActive: boolean;
	@ApiProperty() isFree: boolean;
	@ApiProperty() price?: number;
}

/**
 * A card design and its available actions.
 * @class
 * @extends {DomainBase<CardDesignDTO>}
 */
export class CardDesign extends DomainBase<CardDesignDTO> {

	public readonly cardDesignId: CardDesignId;
	public readonly isFree: boolean;
	public readonly name: string;
	private readonly isDefault: boolean;
	private readonly isActive: boolean;
	private readonly price?: number;

	/**
	 * @param {CardDesignId} cardDesignId The ID of the card design.
	 * @param {string} name The name of the card design.
	 * @param {boolean} isDefault Whether the card design is
	 * the default one
	 * @param {boolean} isActive Whether a card design is active.
	 * @param {boolean} isFree Whether a card design is free.
	 * @param {number} [price] Price of a card design when it is not free.
	 */
	constructor(
		cardDesignId: CardDesignId,
		name: string,
		isDefault: boolean,
		isActive: boolean,
		isFree: boolean,
		price?: number,
	) {
		super();
		this.cardDesignId = cardDesignId;
		this.name = name;
		this.isDefault = isDefault;
		this.isActive = isActive;
		this.isFree = isFree;
		this.price = price;
	}

	/**
	 * Converts the transfer object of a card design into the
	 * domain model.
	 * @param {CardDesignDTO} dto The transfer object.
	 * @returns {CardDesign} The domain model.
	 * @static
	 */
	static fromDTO(dto: CardDesignDTO): CardDesign {
		return new CardDesign(
			new CardDesignId(dto.cardDesignId),
			dto.name,
			dto.isDefault,
			dto.isActive,
			dto.isFree,
			dto.price,
		);
	}

	/**
	 * Converts the card design into its transfer object.
	 * @returns {CardDesignDTO} The transfer object of the card design.
	 */
	toDTO(): CardDesignDTO {
		return {
			price: this.price,
			name: this.name,
			isFree: this.isFree,
			isActive: this.isActive,
			isDefault: this.isDefault,
			cardDesignId: this.cardDesignId.toString(),
		};
	}
}