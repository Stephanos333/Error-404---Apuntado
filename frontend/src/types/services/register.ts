/**
 * Sign up request.
 */
export type RegisterRequest = {
    username: string;
    password: string;
}

/**
 * Sign up response.
 */
export type RegisterResponse = {
    userId: string;
    accessToken: string;
    refreshToken: string;
}