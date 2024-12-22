/**
 * @fileoverview Validation constants and rules for Arena MVP frontend application
 * Defines validation rules for form inputs, file uploads, and data validation
 * @version 1.0.0
 */

/**
 * Email validation rules following RFC 5322 format
 * Enforces business email requirements and length limits
 */
export const EMAIL_VALIDATION = {
  /** Maximum length for email addresses (RFC 5322) */
  MAX_LENGTH: 254,
  /** RFC 5322 compliant email regex pattern */
  PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  /** Requires business domain email addresses */
  BUSINESS_DOMAIN_REQUIRED: true,
} as const;

/**
 * Password validation rules for strength and complexity
 * Enforces secure password requirements
 */
export const PASSWORD_VALIDATION = {
  /** Minimum password length */
  MIN_LENGTH: 8,
  /** Complex password pattern requiring uppercase, lowercase, number, and special character */
  PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
  /** Requires at least one uppercase character */
  REQUIRE_UPPERCASE: true,
  /** Requires at least one lowercase character */
  REQUIRE_LOWERCASE: true,
  /** Requires at least one number */
  REQUIRE_NUMBER: true,
  /** Requires at least one special character */
  REQUIRE_SPECIAL_CHAR: true,
} as const;

/**
 * File upload validation rules for size, type and quantity limits
 * Enforces secure document upload requirements
 */
export const FILE_UPLOAD_VALIDATION = {
  /** Maximum file size in megabytes */
  MAX_SIZE_MB: 10,
  /** Maximum number of files per upload */
  MAX_FILES: 5,
  /** Allowed MIME types for file uploads */
  ALLOWED_TYPES: [
    'application/pdf',                                                    // PDF
    'application/msword',                                                // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.ms-excel',                                          // XLS
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'  // XLSX
  ] as const,
} as const;

/**
 * Text input validation rules for length and formatting
 * Enforces input sanitization and length limits
 */
export const TEXT_INPUT_VALIDATION = {
  /** Maximum text input length */
  MAX_LENGTH: 1000,
  /** Automatically trim whitespace from inputs */
  TRIM_WHITESPACE: true,
  /** Default required field message */
  REQUIRED_FIELD_MESSAGE: 'This field is required',
} as const;

// Type definitions for validation constants
type EmailValidation = typeof EMAIL_VALIDATION;
type PasswordValidation = typeof PASSWORD_VALIDATION;
type FileUploadValidation = typeof FILE_UPLOAD_VALIDATION;
type TextInputValidation = typeof TEXT_INPUT_VALIDATION;

// Ensure constants are readonly
Object.freeze(EMAIL_VALIDATION);
Object.freeze(PASSWORD_VALIDATION);
Object.freeze(FILE_UPLOAD_VALIDATION);
Object.freeze(TEXT_INPUT_VALIDATION);