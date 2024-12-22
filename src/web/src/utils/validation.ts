/**
 * @fileoverview Validation utility functions for Arena MVP frontend application
 * Implements secure form validation, data sanitization, and input security
 * with enhanced accessibility features and performance optimizations
 * 
 * @version 1.0.0
 * @requires dompurify@3.0.5
 * @requires lodash@4.17.21
 */

import { memoize } from 'lodash'; // v4.17.21
import DOMPurify from 'dompurify'; // v3.0.5

import {
  EMAIL_VALIDATION,
  PASSWORD_VALIDATION,
  FILE_UPLOAD_VALIDATION,
  TEXT_INPUT_VALIDATION,
} from '../constants/validation';

import type { FileUpload } from '../types/common';

// Common personal email domains to block when BUSINESS_DOMAIN_REQUIRED is true
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
] as const;

/**
 * Interface for validation response with accessibility support
 */
interface ValidationResponse {
  isValid: boolean;
  error?: string;
  accessibleError?: string;
  securityFlags?: string[];
}

/**
 * Interface for text input validation response with sanitization
 */
interface TextValidationResponse extends ValidationResponse {
  sanitizedValue: string;
}

/**
 * Interface for password validation response with strength scoring
 */
interface PasswordValidationResponse extends ValidationResponse {
  strength: number;
}

/**
 * Validates email addresses against RFC 5322 format and business domain requirements
 * with enhanced security and accessibility features
 * 
 * @param email - Email address to validate
 * @returns Validation result with standard and accessible error messages
 */
export const validateEmail = memoize((email: string): ValidationResponse => {
  // Handle empty input
  if (!email?.trim()) {
    return {
      isValid: false,
      error: 'Email is required',
      accessibleError: 'Please enter an email address',
    };
  }

  // Check length
  if (email.length > EMAIL_VALIDATION.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Email must be less than ${EMAIL_VALIDATION.MAX_LENGTH} characters`,
      accessibleError: `Email address is too long. Maximum length is ${EMAIL_VALIDATION.MAX_LENGTH} characters`,
    };
  }

  // Validate format
  if (!EMAIL_VALIDATION.PATTERN.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format',
      accessibleError: 'Please enter a valid email address format, such as example@company.com',
    };
  }

  // Check business domain requirement
  if (EMAIL_VALIDATION.BUSINESS_DOMAIN_REQUIRED) {
    const domain = email.split('@')[1].toLowerCase();
    if (PERSONAL_EMAIL_DOMAINS.includes(domain as any)) {
      return {
        isValid: false,
        error: 'Business email required',
        accessibleError: 'Please use your company email address instead of a personal email address',
      };
    }
  }

  return { isValid: true };
});

/**
 * Validates password strength and complexity requirements with enhanced security measures
 * 
 * @param password - Password to validate
 * @returns Validation result with strength score and accessible messages
 */
export const validatePassword = memoize((password: string): PasswordValidationResponse => {
  // Handle empty input
  if (!password) {
    return {
      isValid: false,
      error: 'Password is required',
      accessibleError: 'Please enter a password',
      strength: 0,
    };
  }

  // Check minimum length
  if (password.length < PASSWORD_VALIDATION.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${PASSWORD_VALIDATION.MIN_LENGTH} characters`,
      accessibleError: `Password is too short. Minimum length is ${PASSWORD_VALIDATION.MIN_LENGTH} characters`,
      strength: 0,
    };
  }

  // Calculate password strength
  let strength = 0;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*]/.test(password);

  if (hasUppercase) strength += 25;
  if (hasLowercase) strength += 25;
  if (hasNumbers) strength += 25;
  if (hasSpecialChars) strength += 25;

  // Validate against pattern
  if (!PASSWORD_VALIDATION.PATTERN.test(password)) {
    const missing = [];
    if (!hasUppercase) missing.push('uppercase letter');
    if (!hasLowercase) missing.push('lowercase letter');
    if (!hasNumbers) missing.push('number');
    if (!hasSpecialChars) missing.push('special character');

    return {
      isValid: false,
      error: `Password must contain at least one ${missing.join(', ')}`,
      accessibleError: `Password must include at least one of each: ${missing.join(', ')}`,
      strength,
    };
  }

  return { isValid: true, strength };
});

/**
 * Validates file uploads against size and type restrictions with enhanced security checks
 * 
 * @param file - File to validate
 * @param existingFiles - Array of existing files to check against limits
 * @returns Validation result with security flags and accessible messages
 */
export const validateFileUpload = memoize((
  file: FileUpload,
  existingFiles: FileUpload[] = []
): ValidationResponse => {
  const securityFlags: string[] = [];

  // Check file count limit
  if (existingFiles.length >= FILE_UPLOAD_VALIDATION.MAX_FILES) {
    return {
      isValid: false,
      error: `Maximum ${FILE_UPLOAD_VALIDATION.MAX_FILES} files allowed`,
      accessibleError: `You can only upload up to ${FILE_UPLOAD_VALIDATION.MAX_FILES} files. Please remove some files before adding more.`,
      securityFlags,
    };
  }

  // Validate file type
  if (!FILE_UPLOAD_VALIDATION.ALLOWED_TYPES.includes(file.fileType)) {
    securityFlags.push('INVALID_FILE_TYPE');
    return {
      isValid: false,
      error: 'Invalid file type',
      accessibleError: `File type not allowed. Allowed types are: ${FILE_UPLOAD_VALIDATION.ALLOWED_TYPES.join(', ')}`,
      securityFlags,
    };
  }

  // Check file size
  const fileSizeMB = file.sizeBytes / (1024 * 1024);
  if (fileSizeMB > FILE_UPLOAD_VALIDATION.MAX_SIZE_MB) {
    securityFlags.push('FILE_SIZE_EXCEEDED');
    return {
      isValid: false,
      error: `File size must be less than ${FILE_UPLOAD_VALIDATION.MAX_SIZE_MB}MB`,
      accessibleError: `File is too large. Maximum size allowed is ${FILE_UPLOAD_VALIDATION.MAX_SIZE_MB} megabytes`,
      securityFlags,
    };
  }

  // Additional security checks
  if (file.fileType.includes('..')) {
    securityFlags.push('DIRECTORY_TRAVERSAL_ATTEMPT');
    return {
      isValid: false,
      error: 'Invalid file name',
      accessibleError: 'File name contains invalid characters',
      securityFlags,
    };
  }

  return { 
    isValid: true,
    securityFlags 
  };
});

/**
 * Validates and sanitizes text input fields with XSS prevention
 * 
 * @param text - Text to validate and sanitize
 * @param required - Whether the field is required
 * @returns Validation result with sanitized value and accessible messages
 */
export const validateTextInput = memoize((
  text: string,
  required: boolean = false
): TextValidationResponse => {
  // Handle empty input for required fields
  const trimmedText = TEXT_INPUT_VALIDATION.TRIM_WHITESPACE ? text?.trim() : text;
  
  if (required && !trimmedText) {
    return {
      isValid: false,
      sanitizedValue: '',
      error: TEXT_INPUT_VALIDATION.REQUIRED_FIELD_MESSAGE,
      accessibleError: 'This field is required. Please enter some text',
    };
  }

  // Sanitize input
  const sanitizedValue = DOMPurify.sanitize(trimmedText, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
  });

  // Check length
  if (sanitizedValue.length > TEXT_INPUT_VALIDATION.MAX_LENGTH) {
    return {
      isValid: false,
      sanitizedValue,
      error: `Text must be less than ${TEXT_INPUT_VALIDATION.MAX_LENGTH} characters`,
      accessibleError: `Input is too long. Maximum length is ${TEXT_INPUT_VALIDATION.MAX_LENGTH} characters`,
    };
  }

  return {
    isValid: true,
    sanitizedValue,
  };
});