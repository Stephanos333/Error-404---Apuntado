import {Dispatch, SetStateAction} from 'react';
import {ValidationErrorsConstants} from './constants/validation-errors.constants.ts';

/** Form validations used by the auth and table forms. */
export abstract class ValidationUtils {

    /**
     * Validates a table's bet per player.
     * @param {number | string} value The bet.
     * @param {Dispatch<SetStateAction<string>>} setError Sets the error message ('' when valid).
     * @returns {boolean} Whether it is valid.
     */
    static validateBetByPlayer(value: number | string, setError: Dispatch<SetStateAction<string>>): boolean {
        let response: boolean = false;
        if (typeof value == 'string' && !value) setError(ValidationErrorsConstants.REQUIRED_ERROR);
        else if (typeof value == 'number' && value < 1) setError(ValidationErrorsConstants.VALUE_OVER_0_ERROR);
        else {
            setError('');
            response = true;
        }
        return response;
    }

    /**
     * Validates a table name.
     * @param {string} value The name.
     * @param {Dispatch<SetStateAction<string>>} setError Sets the error message ('' when valid).
     * @returns {boolean} Whether it is valid.
     */
    static validateGameName(value: string, setError: Dispatch<SetStateAction<string>>): boolean {
        let response: boolean = false;
        if (!value) setError(ValidationErrorsConstants.REQUIRED_ERROR);
        else if (value.length > 50) setError(ValidationErrorsConstants.LENGTH_LOWER_50_ERROR);
        else {
            setError('');
            response = true;
        }
        return response;
    }

    /**
     * Validates a password: 8+ characters with upper and lower case, a digit and a symbol.
     * @param {string} value The password.
     * @param {Dispatch<SetStateAction<string>>} setError Sets the error message ('' when valid).
     * @returns {boolean} Whether it is valid.
     */
    static validatePassword(value: string, setError: Dispatch<SetStateAction<string>>): boolean {
        let response: boolean = false;
        if (!value) setError(ValidationErrorsConstants.REQUIRED_ERROR);
        else if (!value.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*[!#$%&()*,\-.:;<>?^_{|}~¡¿])\S{8,}$/)) {
            setError(ValidationErrorsConstants.PASSWORD_STRUCTURE_ERROR);
        } else {
            setError('');
            response = true;
        }
        return response;
    }

    /**
     * Validates the password confirmation.
     * @param {string} value The confirmation.
     * @param {string} password The password.
     * @param {Dispatch<SetStateAction<string>>} setError Sets the error message ('' when valid).
     * @returns {boolean} Whether it is valid.
     */
    static validatePasswordConfirmation(
        value: string, password: string,
        setError: Dispatch<SetStateAction<string>>,
    ): boolean {
        let response: boolean = false;
        if (!value) setError(ValidationErrorsConstants.REQUIRED_ERROR);
        else if (value !== password) setError(ValidationErrorsConstants.PASSWORD_CONFIRMATION_DIFFERENT_ERROR);
        else {
            setError('');
            response = true;
        }
        return response;
    }

    /**
     * Validates a username (8+ characters).
     * @param {string} value The username.
     * @param {Dispatch<SetStateAction<string>>} setError Sets the error message ('' when valid).
     * @returns {boolean} Whether it is valid.
     */
    static validateUsername(value: string, setError: Dispatch<SetStateAction<string>>): boolean {
        let response: boolean = false;
        if (!value) setError(ValidationErrorsConstants.REQUIRED_ERROR);
        else if (value.length < 8) setError(ValidationErrorsConstants.MIN_LENGTH_8_ERROR);
        else {
            setError('');
            response = true;
        }
        return response;
    }
}