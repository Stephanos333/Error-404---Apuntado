import {UserType} from '../user.type.ts';

/**
 * Request to change the user's card design.
 */
export type UpdateUserCardDesignRequest = {
    cardDesignId: string
}

/**
 * Response of the update card design service.
 */
export type UpdateUserCardDesignResponse = {
    success: boolean;
    user: UserType;
}