/**
 * @fileoverview Unit tests for date utility functions
 * Tests date formatting, parsing, validation and conversion functions
 * with timezone handling and accessibility compliance.
 * @version 1.0.0
 */

import { describe, test, expect, jest } from '@jest/globals';
import {
  formatDate,
  parseDate,
  isValidDate,
  toApiDate,
  toDisplayDate,
  type DateInput,
  type LocaleConfig
} from '../date';
import { DATE_FORMATS } from '../../constants/common';

// Test constants
const TEST_DATE = new Date('2023-12-25T12:00:00Z');
const TEST_DATE_STRING = '2023-12-25';
const TEST_TIMESTAMP = 1703505600000; // 2023-12-25T12:00:00Z
const TEST_TIMEZONES = ['UTC', 'America/New_York', 'Asia/Tokyo'];
const TEST_LOCALES: LocaleConfig[] = [
  { code: 'en-US' },
  { code: 'fr-FR', weekStartsOn: 1 },
  { code: 'ja-JP', firstWeekContainsDate: 1 }
];

describe('formatDate', () => {
  test('formats valid date with default format', () => {
    const formatted = formatDate(TEST_DATE);
    expect(formatted).toBe('December 25, 2023');
  });

  test('formats valid date with custom format', () => {
    const formatted = formatDate(TEST_DATE, 'yyyy-MM-dd');
    expect(formatted).toBe('2023-12-25');
  });

  test('formats date with different timezones', () => {
    TEST_TIMEZONES.forEach(timezone => {
      const formatted = formatDate(TEST_DATE, DATE_FORMATS.DISPLAY, timezone);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  test('memoizes frequently used formats', () => {
    // First call should cache the result
    const firstCall = formatDate(TEST_DATE);
    // Second call should use cached value
    const secondCall = formatDate(TEST_DATE);
    expect(firstCall).toBe(secondCall);
  });

  test('returns empty string for invalid date', () => {
    const formatted = formatDate('invalid-date');
    expect(formatted).toBe('');
  });

  test('returns empty string for null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  test('formats date string input', () => {
    const formatted = formatDate(TEST_DATE_STRING);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  test('formats timestamp input', () => {
    const formatted = formatDate(TEST_TIMESTAMP);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  test('performance benchmarks for formatting operations', () => {
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      formatDate(TEST_DATE);
    }
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });
});

describe('parseDate', () => {
  test('parses valid date string with default format', () => {
    const parsed = parseDate('December 25, 2023');
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toContain('2023-12-25');
  });

  test('parses valid date string with custom format', () => {
    const parsed = parseDate('2023-12-25', 'yyyy-MM-dd');
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toContain('2023-12-25');
  });

  test('parses with timezone specifications', () => {
    TEST_TIMEZONES.forEach(timezone => {
      const parsed = parseDate(TEST_DATE_STRING, DATE_FORMATS.API, timezone);
      expect(parsed).toBeInstanceOf(Date);
    });
  });

  test('parsing performance for different formats', () => {
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      parseDate(TEST_DATE_STRING);
    }
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });

  test('returns null for invalid date string', () => {
    const parsed = parseDate('invalid-date');
    expect(parsed).toBeNull();
  });

  test('returns null for empty string', () => {
    const parsed = parseDate('');
    expect(parsed).toBeNull();
  });

  test('returns null for null/undefined input', () => {
    // @ts-expect-error Testing invalid input
    expect(parseDate(null)).toBeNull();
    // @ts-expect-error Testing invalid input
    expect(parseDate(undefined)).toBeNull();
  });

  test('returns null for mismatched format', () => {
    const parsed = parseDate('2023-12-25', 'MM/dd/yyyy');
    expect(parsed).toBeNull();
  });
});

describe('isValidDate', () => {
  test('validates valid Date object', () => {
    expect(isValidDate(TEST_DATE)).toBe(true);
  });

  test('validates valid date string', () => {
    expect(isValidDate(TEST_DATE_STRING)).toBe(true);
  });

  test('validates valid timestamp', () => {
    expect(isValidDate(TEST_TIMESTAMP)).toBe(true);
  });

  test('validates edge case dates', () => {
    expect(isValidDate(new Date('1900-01-01'))).toBe(true);
    expect(isValidDate(new Date('2099-12-31'))).toBe(true);
    expect(isValidDate(new Date('1899-12-31'))).toBe(false);
    expect(isValidDate(new Date('2100-01-01'))).toBe(false);
  });

  test('returns false for invalid date', () => {
    expect(isValidDate('invalid-date')).toBe(false);
  });

  test('returns false for null/undefined', () => {
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });

  test('returns false for invalid date string', () => {
    expect(isValidDate('2023-13-45')).toBe(false);
  });

  test('validates dates with different timezone inputs', () => {
    TEST_TIMEZONES.forEach(timezone => {
      expect(isValidDate(new Date().toLocaleString('en-US', { timeZone: timezone }))).toBe(true);
    });
  });
});

describe('toApiDate', () => {
  test('converts Date object to API format', () => {
    const apiDate = toApiDate(TEST_DATE);
    expect(apiDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  test('converts with specific timezone', () => {
    TEST_TIMEZONES.forEach(timezone => {
      const apiDate = toApiDate(TEST_DATE, timezone);
      expect(apiDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  test('converts valid date string to API format', () => {
    const apiDate = toApiDate(TEST_DATE_STRING);
    expect(apiDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  test('converts timestamp to API format', () => {
    const apiDate = toApiDate(TEST_TIMESTAMP);
    expect(apiDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  test('returns empty string for invalid date', () => {
    expect(toApiDate('invalid-date')).toBe('');
  });

  test('returns empty string for null/undefined', () => {
    expect(toApiDate(null)).toBe('');
    expect(toApiDate(undefined)).toBe('');
  });

  test('handles timezone edge cases', () => {
    const date = new Date('2023-12-31T23:59:59Z');
    TEST_TIMEZONES.forEach(timezone => {
      const apiDate = toApiDate(date, timezone);
      expect(apiDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  test('performance of conversion operations', () => {
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      toApiDate(TEST_DATE);
    }
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });
});

describe('toDisplayDate', () => {
  test('converts Date object to display format', () => {
    const displayDate = toDisplayDate(TEST_DATE);
    expect(displayDate).toContain('<time');
    expect(displayDate).toContain('datetime=');
    expect(displayDate).toContain('aria-label=');
  });

  test('converts with locale-specific formatting', () => {
    TEST_LOCALES.forEach(locale => {
      const displayDate = toDisplayDate(TEST_DATE, locale);
      expect(displayDate).toContain('<time');
      expect(displayDate).toContain('datetime=');
      expect(displayDate).toContain('aria-label=');
    });
  });

  test('generates valid ARIA attributes', () => {
    const displayDate = toDisplayDate(TEST_DATE);
    expect(displayDate).toMatch(/aria-label="[^"]+"/);
    expect(displayDate).toMatch(/datetime="[^"]+"/);
  });

  test('maintains screen reader compatibility', () => {
    const displayDate = toDisplayDate(TEST_DATE);
    expect(displayDate).toContain('<time');
    expect(displayDate).toContain('</time>');
  });

  test('converts valid date string to display format', () => {
    const displayDate = toDisplayDate(TEST_DATE_STRING);
    expect(displayDate).toContain('<time');
  });

  test('converts timestamp to display format', () => {
    const displayDate = toDisplayDate(TEST_TIMESTAMP);
    expect(displayDate).toContain('<time');
  });

  test('returns empty string for invalid date', () => {
    expect(toDisplayDate('invalid-date')).toBe('');
  });

  test('returns empty string for null/undefined', () => {
    expect(toDisplayDate(null)).toBe('');
    expect(toDisplayDate(undefined)).toBe('');
  });

  test('performance impact of accessibility features', () => {
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      toDisplayDate(TEST_DATE);
    }
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });
});