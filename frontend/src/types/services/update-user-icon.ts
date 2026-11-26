/**
 * Request to change the user's avatar.
 */
export type UpdateUserIconRequest = {
    icon: string;
}

/**
 * Response of the update avatar service.
 */
export type UpdateUserIconResponse = {
    success: boolean;
}