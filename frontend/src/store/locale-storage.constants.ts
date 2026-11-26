/**
 * Keys stored in `localStorage`.
 * @enum {string}
 * @readonly
 */
export enum LocaleStorageConstants {
    /** User access token. */
    KEY_ACCESS_TOKEN = 'KEY_ACCESS_TOKEN',
    /** User refresh token. */
    KEY_REFRESH_TOKEN = 'KEY_REFRESH_TOKEN',
    /** User id. */
    KEY_USER_ID = 'KEY_USER_ID',
}

/**
 * How each key is stored (plain string or JSON).
 * @const {Record<LocaleStorageConstants, LocaleStorageConfig>}
 */
export const LocaleStorageConfigOf: Record<LocaleStorageConstants, LocaleStorageConfig> = {
    [LocaleStorageConstants.KEY_ACCESS_TOKEN]: {isJson: false},
    [LocaleStorageConstants.KEY_REFRESH_TOKEN]: {isJson: false},
    [LocaleStorageConstants.KEY_USER_ID]: {isJson: false},
};

/** Storage configuration of a key. */
export type LocaleStorageConfig = {
    isJson: boolean;
};

/** Value type of each key. */
export type LocaleStorageData = {
    [LocaleStorageConstants.KEY_REFRESH_TOKEN]: string,
    [LocaleStorageConstants.KEY_ACCESS_TOKEN]: string,
    [LocaleStorageConstants.KEY_USER_ID]: string,
};

/**
 * Value type of one key.
 * @template T The storage key.
 * @type {LocaleStorageData[T]}
 */
export type LocaleStorageDataOf<T extends LocaleStorageConstants> = LocaleStorageData[T];
