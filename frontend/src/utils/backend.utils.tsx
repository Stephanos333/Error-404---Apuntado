import {BackendConfigConstants, BackendConfigType, BackendConstants} from './constants/backend.constants.ts';
import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {LocaleStorageUtils} from '../store/locale-storage.utils.ts';
import {LocaleStorageConstants} from '../store/locale-storage.constants.ts';
import {ErrorResponseType} from '../types/error.response.type.ts';
import {RefreshTokenRequest, RefreshTokenResponse} from '../types/services/refresh-token.ts';
import {RoutesConstants} from '../config/routes.constants.ts';

/**
 * Axios wrapper for the backend API: adds the access token, refreshes it once on a 401
 * and maps errors to the alert codes.
 */
export class BackendUtils {

    /**
     * @param {(message: string) => (void)} callBackErrors Receives the error code of a failed call.
     */
    constructor(
        private readonly callBackErrors?: (message: string) => (void),
    ) {
    }

    /**
     * PATCH request.
     * @template Res Response type.
     * @template Req Request type.
     * @param {BackendConfigConstants} url
     * @param {Req} body Request body.
     * @param {number} [attempts=0] Attempts so far.
     * @returns {Promise<Res | undefined>} The response, or `undefined` on error.
     */
    public async patch<Res, Req>(
        url: BackendConstants,
        body: Req,
        attempts: number = 0
    ): Promise<Res | undefined> {
        const serviceConfig: BackendConfigType = BackendConfigConstants[url];
        return axios.patch<Res>(url, body, BackendUtils.buildRequestConfig(serviceConfig))
            .then((data: AxiosResponse): Res => data.data)
            .catch(async (e: ErrorResponseType) => {
                if (BackendUtils.resolveIfRetry(serviceConfig, e, attempts)) {
                    return this.refreshAccessToken().then(() => {
                        attempts += 1;
                        return this.patch<Res, Req>(url, body, attempts++);
                    });
                }
                this.processError(serviceConfig, e);
                return undefined;
            });
    }

    /**
     * POST request.
     * @template Res Response type.
     * @template Req Request type.
     * @param {BackendConfigConstants} url
     * @param {Req} body Request body.
     * @param {number} [attempts=0] Attempts so far.
     * @returns {Promise<Res | undefined>} The response, or `undefined` on error.
     */
    public async post<Res, Req>(
        url: BackendConstants,
        body?: Req,
        attempts: number = 0
    ): Promise<Res | undefined> {
        const serviceConfig: BackendConfigType = BackendConfigConstants[url];
        return axios.post<Res>(url, body, BackendUtils.buildRequestConfig(serviceConfig))
            .then((data: AxiosResponse): Res => data.data)
            .catch(async (e: ErrorResponseType) => {
                if (BackendUtils.resolveIfRetry(serviceConfig, e, attempts)) {
                    return this.refreshAccessToken().then(() => {
                        attempts += 1;
                        return this.post<Res, Req>(url, body, attempts++);
                    });
                }
                this.processError(serviceConfig, e);
                return undefined;
            });
    }

    /**
     * GET request.
     * @template Res Response type.
     * @template Req Request type.
     * @param {BackendConfigConstants} url
     * @param {Req} query Query parameters.
     * @param {number} [attempts=0] Attempts so far.
     * @returns {Promise<Res | undefined>} The response, or `undefined` on error.
     */
    public async get<Res, Req>(
        url: BackendConstants,
        query?: Req,
        attempts: number = 0
    ): Promise<Res | undefined> {
        const serviceConfig: BackendConfigType = BackendConfigConstants[url];
        const backendConfig: AxiosRequestConfig = BackendUtils.buildRequestConfig(serviceConfig);
        if (query) backendConfig.params = query;
        return axios.get<Res>(url, backendConfig)
            .then((data: AxiosResponse): Res => data.data)
            .catch(async (e: ErrorResponseType) => {
                if (BackendUtils.resolveIfRetry(serviceConfig, e, attempts)) {
                    return this.refreshAccessToken().then(() => {
                        attempts += 1;
                        return this.get<Res, Req>(url, query, attempts++);
                    });
                }
                this.processError(serviceConfig, e);
                return undefined;
            });
    }

    /**
     * DELETE request.
     * @template Res Response type.
     * @param {BackendConstants} url
     * @param {number} [attempts=0] Attempts so far.
     * @returns {Promise<Res | undefined>} The response, or `undefined` on error.
     */
    public async delete<Res>(
        url: BackendConstants,
        attempts: number = 0
    ): Promise<Res | undefined> {
        const serviceConfig: BackendConfigType = BackendConfigConstants[url];
        return axios.delete<Res>(url, BackendUtils.buildRequestConfig(serviceConfig))
            .then((data: AxiosResponse): Res => data.data)
            .catch(async (e: ErrorResponseType) => {
                if (BackendUtils.resolveIfRetry(serviceConfig, e, attempts)) {
                    return this.refreshAccessToken().then(() => {
                        attempts += 1;
                        return this.delete<Res>(url, attempts++);
                    });
                }
                this.processError(serviceConfig, e);
                return undefined;
            });
    }

    /**
     * Handles a failed call: an expired session sends the user to log in; any other error
     * goes to the callback.
     * @param {BackendConfigType} serviceConfig The service configuration.
     * @param {ErrorResponseType} e The error.
     * @private
     */
    private processError(serviceConfig: BackendConfigType, e: ErrorResponseType): void {
        if (serviceConfig.requireAccessToken && BackendUtils.extractCode(e) === 401) {
            LocaleStorageUtils.del(LocaleStorageConstants.KEY_ACCESS_TOKEN);
            LocaleStorageUtils.del(LocaleStorageConstants.KEY_REFRESH_TOKEN);
            window.location.href = `/#${RoutesConstants.LOGIN_ROUTE}`;
        } else {
            const message: string = BackendUtils.extractMessage(e);
            // The callback shows the error to the user; without one it is logged so it is not lost.
            if (this.callBackErrors) this.callBackErrors(message);
            else console.error(`[BackendUtils] ${message}`);
        }

    }

    /**
     * Refreshes the access token with the stored refresh token.
     * @private
     * @async
     */
    private async refreshAccessToken(): Promise<void> {
        const refreshToken = LocaleStorageUtils.get<LocaleStorageConstants.KEY_REFRESH_TOKEN>(LocaleStorageConstants.KEY_REFRESH_TOKEN);
        if (refreshToken) {
            const body: RefreshTokenRequest = {refreshToken};
            return this.post<RefreshTokenResponse, RefreshTokenRequest>(BackendConstants.REFRESH_ACCESS_TOKEN_URL, body)
                // `post` already handles errors (processError) and resolves `undefined` if the refresh fails.
                .then((res) => {
                    if (res) {
                        LocaleStorageUtils.set<LocaleStorageConstants.KEY_ACCESS_TOKEN>(
                            LocaleStorageConstants.KEY_ACCESS_TOKEN, res.accessToken
                        );
                    }
                });
        }
    }

    /**
     * Whether a call must be retried (a 401 on the first attempt of a retryable service).
     * @param {BackendConfigType} c The service configuration.
     * @param {ErrorResponseType} e The error.
     * @param {number} attempts Attempts so far.
     * @returns {boolean} `true` to retry.
     * @static
     * @private
     */
    private static resolveIfRetry(c: BackendConfigType, e: ErrorResponseType, attempts: number): boolean {
        return c.retryRequest && BackendUtils.extractCode(e) == 401 && attempts == 0;
    }

    /**
     * Extracts the HTTP status code of an error.
     * @param {ErrorResponseType} e The error.
     * @return {number} The status code (500 when unknown).
     * @private
     */
    private static extractCode(e: ErrorResponseType): number {
        return e?.response?.data?.code || 500;
    }

    /**
     * Extracts the error code sent by the backend.
     * @param {ErrorResponseType} e The error.
     * @returns {string} The error code (`UNKNOWN_ERROR` when missing).
     * @private
     */
    private static extractMessage(e: ErrorResponseType): string {
        return e?.response?.data?.message || 'UNKNOWN_ERROR';
    }

    /**
     * Builds the Axios config for a service (base URL and token).
     * @param {BackendConfigType} backendConfig The service configuration.
     * @returns {AxiosRequestConfig} The Axios config.
     * @private
     * @static
     */
    private static buildRequestConfig(backendConfig: BackendConfigType): AxiosRequestConfig {
        const response: AxiosRequestConfig = {
            baseURL: import.meta.env.VITE_BACKEND_BASE_URL,
        };
        if (backendConfig.requireAccessToken) {
            const key: LocaleStorageConstants = LocaleStorageConstants.KEY_ACCESS_TOKEN;
            const accessToken = LocaleStorageUtils.get<typeof key>(key);
            response.headers = {authorization: `Bearer ${accessToken}`};
        }
        return response;
    }
}