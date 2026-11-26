/**
 * A card design.
 */
export type CardDesignType = {
    cardDesignId: string;
    name: string;
    isDefault: boolean;
    isActive: boolean;
    isFree: boolean;
    price?: number;
}