import {CardDesignShopType} from '../card-design.shop.type.ts';

/**
 * Response of the active card designs service.
 */
export type GetActiveCardDesigns = {
    success: boolean,
    data: Array<CardDesignShopType>;
}