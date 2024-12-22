/**
 * @fileoverview A reusable React textarea component with validation, accessibility, and styling
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx'; // v2.0.0
import { TEXT_INPUT_VALIDATION } from '../../constants/validation';

/**
 * Props interface for the TextArea component
 * Extends native textarea attributes with custom functionality
 */
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Unique identifier for the textarea */
  id: string;
  /** Label text for the textarea */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text below the textarea */
  hint?: string;
  /** Number of visible text rows */
  rows?: number;
  /** Maximum character length */
  maxLength?: number;
  /** Whether to show remaining character count */
  showCharacterCount?: boolean;
  /** Whether the field is required */
  required?: boolean;
}

/**
 * TextArea component that provides consistent styling, validation, and accessibility
 * features for multi-line text input across the Arena MVP application.
 */
const TextArea: React.FC<TextAreaProps> = ({
  id,
  label,
  error,
  hint,
  rows = 4,
  maxLength = TEXT_INPUT_VALIDATION.MAX_LENGTH,
  showCharacterCount = false,
  required = false,
  value = '',
  onChange,
  onBlur,
  className,
  ...props
}) => {
  // State for internal value management and character count
  const [internalValue, setInternalValue] = useState(value);
  const [characterCount, setCharacterCount] = useState(String(value).length);
  const [isFocused, setIsFocused] = useState(false);
  
  // Refs for element access
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate unique IDs for accessibility
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const countId = `${id}-count`;

  /**
   * Handles textarea value changes with whitespace trimming
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = TEXT_INPUT_VALIDATION.TRIM_WHITESPACE 
      ? event.target.value.trim() 
      : event.target.value;

    setInternalValue(newValue);
    setCharacterCount(newValue.length);

    if (onChange) {
      onChange(event);
    }
  }, [onChange]);

  /**
   * Handles textarea blur events for validation
   */
  const handleBlur = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);

    if (required && !event.target.value) {
      event.target.setCustomValidity(TEXT_INPUT_VALIDATION.REQUIRED_FIELD_MESSAGE);
    } else {
      event.target.setCustomValidity('');
    }

    if (onBlur) {
      onBlur(event);
    }
  }, [onBlur, required]);

  /**
   * Handles textarea focus events
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Update internal state when value prop changes
  useEffect(() => {
    setInternalValue(value);
    setCharacterCount(String(value).length);
  }, [value]);

  // Construct className strings
  const containerClassName = clsx(
    'relative w-full',
    className
  );

  const textareaClassName = clsx(
    'block w-full rounded-md shadow-sm sm:text-sm resize-none transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    {
      'border-gray-300 focus:border-blue-500 focus:ring-blue-500': !error,
      'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500': error,
      'border-2': isFocused,
    }
  );

  // Construct aria-describedby string
  const ariaDescribedBy = clsx({
    [errorId]: error,
    [hintId]: hint,
    [countId]: showCharacterCount,
  });

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={textareaClassName}
        aria-invalid={!!error}
        aria-describedby={ariaDescribedBy || undefined}
        aria-required={required}
        {...props}
      />

      <div className="mt-1 flex justify-between">
        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Character count */}
        {showCharacterCount && (
          <p
            id={countId}
            className={clsx(
              'text-sm',
              error ? 'text-red-600' : 'text-gray-500'
            )}
          >
            {characterCount}/{maxLength}
          </p>
        )}
      </div>

      {/* Hint text */}
      {hint && !error && (
        <p
          id={hintId}
          className="mt-1 text-sm text-gray-500"
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default TextArea;