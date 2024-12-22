/**
 * @fileoverview Date utility functions for the Arena MVP frontend application.
 * Provides standardized date formatting, parsing, validation and conversion with
 * timezone awareness and internationalization support.
 * @version 1.0.0
 */

import { format, parse, isValid } from 'date-fns'; // v2.30.0
import { formatInTimeZone } from 'date-fns-tz'; // v2.0.0
import { DATE_FORMATS } from '../constants/common';

// Type definitions
type DateInput = Date | string | number | null | undefined;
type LocaleConfig = {
  code: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  firstWeekContainsDate?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
};

// Constants
const DEFAULT_FORMAT = DATE_FORMATS.DISPLAY;
const DEFAULT_TIMEZONE = 'UTC';
const FORMAT_CACHE_SIZE = 100;

// Memoization cache for formatted dates
const formatCache = new Map<string, string>();
const cacheKey = (date: Date, format: string, timezone: string, locale?: LocaleConfig): string => 
  `${date.getTime()}-${format}-${timezone}-${locale?.code || 'default'}`;

/**
 * Formats a date value into a localized string using the specified format with timezone support.
 * Implements memoization for improved performance on repeated format patterns.
 * 
 * @param date - The date to format
 * @param formatStr - The format string to use (defaults to DATE_FORMATS.DISPLAY)
 * @param timezone - The timezone to use for formatting (defaults to UTC)
 * @param locale - Optional locale configuration for internationalization
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (
  date: DateInput,
  formatStr: string = DEFAULT_FORMAT,
  timezone: string = DEFAULT_TIMEZONE,
  locale?: LocaleConfig
): string => {
  try {
    if (!isValidDate(date)) {
      return '';
    }

    const dateObj = new Date(date!);
    const key = cacheKey(dateObj, formatStr, timezone, locale);

    // Check cache first
    if (formatCache.has(key)) {
      return formatCache.get(key)!;
    }

    // Format with timezone support
    const formatted = formatInTimeZone(dateObj, timezone, formatStr, {
      locale: locale?.code ? require(`date-fns/locale/${locale.code}`) : undefined,
      weekStartsOn: locale?.weekStartsOn,
      firstWeekContainsDate: locale?.firstWeekContainsDate,
    });

    // Manage cache size
    if (formatCache.size >= FORMAT_CACHE_SIZE) {
      const firstKey = formatCache.keys().next().value;
      formatCache.delete(firstKey);
    }

    formatCache.set(key, formatted);
    return formatted;
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

/**
 * Parses a date string into a Date object with comprehensive error handling.
 * Supports timezone-aware parsing and various format patterns.
 * 
 * @param dateStr - The date string to parse
 * @param formatStr - The format string to use for parsing
 * @param timezone - The timezone to consider during parsing
 * @returns Parsed Date object or null if invalid
 */
export const parseDate = (
  dateStr: string,
  formatStr: string = DEFAULT_FORMAT,
  timezone: string = DEFAULT_TIMEZONE
): Date | null => {
  try {
    if (!dateStr) {
      return null;
    }

    // Handle ISO format strings
    if (dateStr.includes('T') && dateStr.includes('Z')) {
      const parsed = new Date(dateStr);
      return isValid(parsed) ? parsed : null;
    }

    // Parse with format string
    const parsed = parse(dateStr, formatStr, new Date());
    if (!isValid(parsed)) {
      return null;
    }

    // Apply timezone offset
    const tzOffset = new Date().getTimezoneOffset();
    return new Date(parsed.getTime() + tzOffset * 60000);
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
};

/**
 * Validates date values with comprehensive edge case handling.
 * Checks for null/undefined values, invalid formats, and date ranges.
 * 
 * @param date - The date value to validate
 * @returns True if valid date, false otherwise
 */
export const isValidDate = (date: DateInput): boolean => {
  if (!date) {
    return false;
  }

  try {
    const dateObj = new Date(date);
    return isValid(dateObj) && 
           dateObj.getTime() > new Date('1900-01-01').getTime() &&
           dateObj.getTime() < new Date('2100-01-01').getTime();
  } catch {
    return false;
  }
};

/**
 * Converts dates to API format with timezone handling.
 * Ensures consistent ISO 8601 format for API communication.
 * 
 * @param date - The date to convert
 * @param timezone - The timezone to use (defaults to UTC)
 * @returns ISO 8601 formatted date string or empty string if invalid
 */
export const toApiDate = (
  date: DateInput,
  timezone: string = DEFAULT_TIMEZONE
): string => {
  try {
    if (!isValidDate(date)) {
      return '';
    }

    return formatDate(date, DATE_FORMATS.API, timezone);
  } catch (error) {
    console.error('API date conversion error:', error);
    return '';
  }
};

/**
 * Converts dates to localized display format with accessibility support.
 * Adds ARIA attributes and handles internationalization.
 * 
 * @param date - The date to convert
 * @param locale - The locale configuration for formatting
 * @param timezone - The timezone to use (defaults to UTC)
 * @returns Localized display date string or empty string if invalid
 */
export const toDisplayDate = (
  date: DateInput,
  locale?: LocaleConfig,
  timezone: string = DEFAULT_TIMEZONE
): string => {
  try {
    if (!isValidDate(date)) {
      return '';
    }

    const formatted = formatDate(date, DATE_FORMATS.DISPLAY, timezone, locale);
    const isoDate = new Date(date!).toISOString();

    // Add accessibility attributes
    return `<time datetime="${isoDate}" aria-label="${formatted}">${formatted}</time>`;
  } catch (error) {
    console.error('Display date conversion error:', error);
    return '';
  }
};

// Export types for external use
export type { DateInput, LocaleConfig };