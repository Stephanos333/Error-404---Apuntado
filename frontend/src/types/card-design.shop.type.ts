import {CardDesignType} from './card-design.type.ts';

/**
 * Card design as listed in the shop.
 */
export type CardDesignShopType = CardDesignType & {
    canSelect: boolean;
}