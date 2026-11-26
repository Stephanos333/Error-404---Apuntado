/**
 * Request to refresh the user's access token.
 */
export type RefreshTokenRequest = {
    refreshToken: string;
}

/**
 * Response of the refresh-token service.
 */
export type RefreshTokenResponse = {
    success: boolean;
    accessToken: string;
}