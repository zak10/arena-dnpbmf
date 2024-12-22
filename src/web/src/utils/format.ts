/**
 * @fileoverview Utility functions for formatting data with internationalization support
 * Provides memoized formatting functions for numbers, currency, file sizes, and text
 * with strict input validation and performance optimization.
 * @version 1.0.0
 */

import numeral from 'numeral'; // v2.0.6
import { memoize } from 'lodash'; // v4.17.21
import { UI_CONFIG } from '../constants/common';

// Global constants for formatting configuration
const DEFAULT_DECIMALS = 2;
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const BINARY_MULTIPLIER = 1024;
const DECIMAL_MULTIPLIER = 1000;
const THOUSAND_SEPARATOR = ',';
const DECIMAL_SEPARATOR = '.';
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
} as const;
const RTL_LOCALES = ['ar', 'he', 'fa'] as const;

// Types for function parameters
type FormatNumberOptions = {
  decimals?: number;
  locale?: string;
};

type FormatCurrencyOptions = {
  currency?: keyof typeof CURRENCY_SYMBOLS;
  locale?: string;
};

type TruncateOptions = {
  wordBoundary?: boolean;
  preserveHtml?: boolean;
  ellipsis?: string;
};

/**
 * Formats a number with proper thousand separators and decimal places
 * @param value - Number to format
 * @param options - Formatting options
 * @returns Formatted number string
 */
export const formatNumber = memoize((
  value: number,
  options: FormatNumberOptions = {}
): string => {
  const {
    decimals = DEFAULT_DECIMALS,
    locale = UI_CONFIG.LOCALE_CONFIG?.default || 'en'
  } = options;

  if (!Number.isFinite(value)) {
    return '0';
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return formatter.format(value);
  } catch (error) {
    console.error('Number formatting error:', error);
    return numeral(value).format(`0,0.[${decimals}]`);
  }
}, (value, options) => `${value}-${JSON.stringify(options)}`);

/**
 * Formats a monetary value with currency symbol and proper decimals
 * @param value - Amount to format
 * @param options - Currency formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = memoize((
  value: number,
  options: FormatCurrencyOptions = {}
): string => {
  const {
    currency = 'USD',
    locale = UI_CONFIG.LOCALE_CONFIG?.default || 'en'
  } = options;

  if (!Number.isFinite(value)) {
    return `${CURRENCY_SYMBOLS[currency]}0.00`;
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(value);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${CURRENCY_SYMBOLS[currency]}${numeral(value).format('0,0.00')}`;
  }
}, (value, options) => `${value}-${JSON.stringify(options)}`);

/**
 * Formats a file size in bytes to human readable format
 * @param bytes - Size in bytes
 * @param useBinaryUnits - Use binary (1024) or decimal (1000) units
 * @returns Formatted file size string
 */
export const formatFileSize = memoize((
  bytes: number,
  useBinaryUnits: boolean = true
): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  const multiplier = useBinaryUnits ? BINARY_MULTIPLIER : DECIMAL_MULTIPLIER;
  const units = FILE_SIZE_UNITS;

  let size = bytes;
  let unitIndex = 0;

  while (size >= multiplier && unitIndex < units.length - 1) {
    size /= multiplier;
    unitIndex++;
  }

  // Format with appropriate precision based on magnitude
  const precision = unitIndex === 0 ? 0 : size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}, (bytes, useBinaryUnits) => `${bytes}-${useBinaryUnits}`);

/**
 * Truncates text to specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param options - Truncation options
 * @returns Truncated text string
 */
export const truncateText = memoize((
  text: string,
  maxLength: number,
  options: TruncateOptions = {}
): string => {
  const {
    wordBoundary = true,
    preserveHtml = false,
    ellipsis = '...'
  } = options;

  if (!text || text.length <= maxLength) {
    return text;
  }

  // Handle RTL text
  const locale = UI_CONFIG.LOCALE_CONFIG?.default || 'en';
  const isRtl = RTL_LOCALES.includes(locale as typeof RTL_LOCALES[number]);
  
  let truncated = text.slice(0, maxLength - ellipsis.length);

  if (preserveHtml) {
    // Simple HTML entity preservation
    truncated = truncated.replace(/&[^;]+;/g, (entity) => {
      return text.indexOf(entity) + entity.length <= maxLength ? entity : '';
    });
  }

  if (wordBoundary) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.substr(0, lastSpace);
    }
  }

  return isRtl ? `${ellipsis}${truncated}` : `${truncated}${ellipsis}`;
}, (text, maxLength, options) => `${text}-${maxLength}-${JSON.stringify(options)}`);

// Type exports for TypeScript support
export type { FormatNumberOptions, FormatCurrencyOptions, TruncateOptions };