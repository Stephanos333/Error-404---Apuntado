/**
 * Form validation messages (Spanish UI text).
 * @enum
 * @readonly
 */
export enum ValidationErrorsConstants {
    /** The value must be shorter than 50 characters. */
    LENGTH_LOWER_50_ERROR = 'Debe tener menos de 50 caracteres.',
    /** The value must have at least 8 characters. */
    MIN_LENGTH_8_ERROR = 'Debe tener 8 caracteres o más.',
    /** The password and its confirmation differ. */
    PASSWORD_CONFIRMATION_DIFFERENT_ERROR = 'Las contraseñas no coinciden.',
    /** The password does not follow the password rules. */
    PASSWORD_STRUCTURE_ERROR = 'Usa 8 caracteres o más, con mayúscula, minúscula, número y un carácter especial.',
    /** The value is required. */
    REQUIRED_ERROR = 'Este campo es obligatorio.',
    /** The value must be greater than 0. */
    VALUE_OVER_0_ERROR = 'Debe ser mayor que 0.'
}
