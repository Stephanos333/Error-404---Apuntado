import { DomainBase } from '../shared/domain.base';
import { CardType } from './card-type';
import { CardSuit } from './card-suit';

/**
 * Transfer object of the cards.
 * It is plain TypeScript code (FF-05): the OpenAPI documentation lives in
 * `domain/card/card-api.dto.ts`.
 * @class
 */
export class CardDTO {
	type: string;
	suit: string;
}

/**
 * A card and its available actions.
 * @class
 * @extends {DomainBase<CardDTO>}
 */
export class Card extends DomainBase<CardDTO> {
	private readonly _type: CardType;
	private readonly _suit: CardSuit;

	/**
	 * @param {CardType} type The type of the card.
	 * @param {CardSuit} suit The suit of the card.
	 */
	constructor(type: CardType, suit: CardSuit) {
		super();
		this._type = type;
		this._suit = suit;
	}

	get type(): CardType {
		return this._type;
	}

	get suit(): CardSuit {
		return this._suit;
	}

	/**
	 * Converts the transfer object of the card into the domain model
	 * @param {CardDTO} dto The transfer object.
	 * @returns {Card} The card.
	 * @static
	 */
	static fromDTO(dto: CardDTO): Card {
		return new Card(new CardType(dto.type), new CardSuit(dto.suit));
	}

	/**
	 * Converts the card into its transfer object.
	 * @returns {CardDTO} The transfer object.
	 */
	toDTO(): CardDTO {
		return {
			type: this._type.toString(),
			suit: this._suit.toString(),
		};
	}

	/**
	 * Determines the next card from a value.
	 * @param {number} current The current value of a card.
	 * @returns {number} The next card.
	 */
	static getNextValue(current: number): number {
		let next: number = current + 1;
		if (next > 13) next = 1;
		return next;
	}
}
