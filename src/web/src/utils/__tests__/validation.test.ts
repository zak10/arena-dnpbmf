/**
 * @jest/globals v29.0.0
 * Unit tests for validation utility functions
 * Tests form validation, data validation, input sanitization and security controls
 */

import { describe, test, expect } from '@jest/globals';
import {
  validateEmail,
  validatePassword,
  validateFileUpload,
  validateTextInput,
} from '../validation';

import {
  EMAIL_VALIDATION,
  PASSWORD_VALIDATION,
  FILE_UPLOAD_VALIDATION,
  TEXT_INPUT_VALIDATION,
} from '../../constants/validation';

import type { FileUpload } from '../../types/common';

describe('validateEmail', () => {
  test('should validate correct business email formats', () => {
    const validEmails = [
      'user@company.com',
      'first.last@enterprise.co.uk',
      'name+tag@business.org',
      'local@subdomain.company.net',
    ];

    validEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  test('should reject personal email domains when business required', () => {
    const personalEmails = [
      'user@gmail.com',
      'name@yahoo.com',
      'person@hotmail.com',
      'contact@outlook.com',
    ];

    personalEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Business email required');
      expect(result.accessibleError).toBe(
        'Please use your company email address instead of a personal email address'
      );
    });
  });

  test('should enforce RFC 5322 format', () => {
    const invalidFormats = [
      'invalid-email',
      'missing@domain',
      '@nodomain.com',
      'spaces in@domain.com',
      'unicode@🚀.com',
    ];

    invalidFormats.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });
  });

  test('should enforce maximum length', () => {
    const longEmail = 'a'.repeat(EMAIL_VALIDATION.MAX_LENGTH + 1) + '@company.com';
    const result = validateEmail(longEmail);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(`Email must be less than ${EMAIL_VALIDATION.MAX_LENGTH} characters`);
  });
});

describe('validatePassword', () => {
  test('should validate passwords meeting all requirements', () => {
    const validPasswords = [
      'Password1!',
      'Complex@123',
      'Secure&Pass9',
      'Test123$%',
    ];

    validPasswords.forEach(password => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe(100);
    });
  });

  test('should calculate correct strength scores', () => {
    const passwordTests = [
      { password: 'onlylower', expectedStrength: 25 },
      { password: 'ONLYUPPER', expectedStrength: 25 },
      { password: 'lower123UPPER', expectedStrength: 75 },
      { password: 'Complete@123', expectedStrength: 100 },
    ];

    passwordTests.forEach(({ password, expectedStrength }) => {
      const result = validatePassword(password);
      expect(result.strength).toBe(expectedStrength);
    });
  });

  test('should enforce minimum length', () => {
    const shortPassword = 'Ab1!';
    const result = validatePassword(shortPassword);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      `Password must be at least ${PASSWORD_VALIDATION.MIN_LENGTH} characters`
    );
    expect(result.strength).toBe(0);
  });

  test('should require all character types', () => {
    const missingRequirements = [
      { password: 'onlylowercase', missing: ['uppercase letter', 'number', 'special character'] },
      { password: 'ONLYUPPERCASE', missing: ['lowercase letter', 'number', 'special character'] },
      { password: 'NoNumbers!', missing: ['number'] },
      { password: 'NoSpecial123', missing: ['special character'] },
    ];

    missingRequirements.forEach(({ password, missing }) => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain(missing.join(', '));
    });
  });
});

describe('validateFileUpload', () => {
  const createMockFile = (
    fileType: string,
    sizeBytes: number
  ): FileUpload => ({
    id: '123',
    name: 'test.pdf',
    fileType,
    sizeBytes,
    uploadedAt: new Date().toISOString(),
    securityClassification: 'SENSITIVE'
  });

  test('should validate allowed file types', () => {
    FILE_UPLOAD_VALIDATION.ALLOWED_TYPES.forEach(fileType => {
      const file = createMockFile(fileType, 1024 * 1024); // 1MB
      const result = validateFileUpload(file);
      expect(result.isValid).toBe(true);
    });
  });

  test('should reject files exceeding size limit', () => {
    const oversizedFile = createMockFile(
      'application/pdf',
      (FILE_UPLOAD_VALIDATION.MAX_SIZE_MB + 1) * 1024 * 1024
    );
    
    const result = validateFileUpload(oversizedFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      `File size must be less than ${FILE_UPLOAD_VALIDATION.MAX_SIZE_MB}MB`
    );
    expect(result.securityFlags).toContain('FILE_SIZE_EXCEEDED');
  });

  test('should enforce maximum file count', () => {
    const existingFiles = Array(FILE_UPLOAD_VALIDATION.MAX_FILES)
      .fill(null)
      .map(() => createMockFile('application/pdf', 1024 * 1024));
    
    const newFile = createMockFile('application/pdf', 1024 * 1024);
    const result = validateFileUpload(newFile, existingFiles);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      `Maximum ${FILE_UPLOAD_VALIDATION.MAX_FILES} files allowed`
    );
  });

  test('should detect directory traversal attempts', () => {
    const maliciousFile = createMockFile('../malicious.pdf', 1024);
    const result = validateFileUpload(maliciousFile);
    
    expect(result.isValid).toBe(false);
    expect(result.securityFlags).toContain('DIRECTORY_TRAVERSAL_ATTEMPT');
  });
});

describe('validateTextInput', () => {
  test('should validate and sanitize valid inputs', () => {
    const validInputs = [
      'Regular text input',
      'Special chars: @#$%',
      '   Trimmed text   ',
      'Numbers 123',
    ];

    validInputs.forEach(input => {
      const result = validateTextInput(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBeDefined();
    });
  });

  test('should enforce required fields', () => {
    const emptyInputs = ['', '   ', null, undefined];

    emptyInputs.forEach(input => {
      const result = validateTextInput(input as string, true);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(TEXT_INPUT_VALIDATION.REQUIRED_FIELD_MESSAGE);
    });
  });

  test('should enforce maximum length', () => {
    const longText = 'a'.repeat(TEXT_INPUT_VALIDATION.MAX_LENGTH + 1);
    const result = validateTextInput(longText);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      `Text must be less than ${TEXT_INPUT_VALIDATION.MAX_LENGTH} characters`
    );
  });

  test('should sanitize HTML and script content', () => {
    const unsafeInputs = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'Text with <b>tags</b>',
    ];

    unsafeInputs.forEach(input => {
      const result = validateTextInput(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).not.toContain('<');
      expect(result.sanitizedValue).not.toContain('>');
    });
  });
});