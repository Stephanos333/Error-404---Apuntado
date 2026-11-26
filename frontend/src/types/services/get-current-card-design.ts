import {CardDesignType} from '../card-design.type.ts';

/**
 * Response of the current card design service.
 */
export type GetCurrentCardDesign = {
    success: boolean,
    design: CardDesignType;
}