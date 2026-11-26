import {UserType} from '../user.type.ts';

/**
 * Response of the current user service.
 */
export type GetMeResponse = {
    success: boolean,
    user: UserType;
}