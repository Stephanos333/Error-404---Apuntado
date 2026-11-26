/**
 * Log in request.
 */
export type LoginRequest = {
    username: string;
    password: string;
}

/**
 * Log in response.
 */
export type LoginResponse = {
    success: boolean;
    userId: string;
    accessToken: string;
    refreshToken: string;
}