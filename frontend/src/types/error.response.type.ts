/**
 * Error response of the services.
 */
export type ErrorResponseType = {
    response?: {
        data?: {
            code?: number;
            message?: string;
            success?: boolean;
        }
    };
}