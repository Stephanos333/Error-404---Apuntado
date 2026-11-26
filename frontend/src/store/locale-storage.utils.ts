import {
    LocaleStorageConfig,
    LocaleStorageConfigOf,
    LocaleStorageConstants,
    LocaleStorageDataOf
} from './locale-storage.constants.ts';

/** Typed helpers over `localStorage`. */
export abstract class LocaleStorageUtils {

    /**
     * Removes a key.
     * @param {LocaleStorageConstants} key The key to remove.
     */
    static del(key: LocaleStorageConstants): void {
        localStorage.removeItem(key);
    }

    /**
     * Reads a key.
     * @param {LocaleStorageConstants} key The key to read.
     * @template T The storage key.
     * @returns {LocaleStorageDataOf<T> | null}
     */
    static get<T extends LocaleStorageConstants>(key: LocaleStorageConstants): LocaleStorageDataOf<T> | null {
        const config: LocaleStorageConfig = LocaleStorageConfigOf[key];
        const value: string | null = localStorage.getItem(key);
        if (!value) return null;
        if (config && config.isJson) return JSON.parse(value);
        return value as LocaleStorageDataOf<T>;
    }

    /**
     * Stores a key.
     * @template T The storage key.
     * @param {LocaleStorageConstants} key The key to store.
     * @param {LocaleStorageDataOf<T>} data The value.
     */
    static set<T extends LocaleStorageConstants>(key: LocaleStorageConstants, data: LocaleStorageDataOf<T>): void {
        const toSave: string = typeof data === 'string' ? data : JSON.stringify(data);
        localStorage.setItem(key,  toSave);
    }
}