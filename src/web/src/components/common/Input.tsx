import React, { useCallback, useRef, useState } from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import Icon from './Icon';
import { IconName } from '../../assets/icons';
import { TEXT_INPUT_VALIDATION } from '../../constants/validation';

/**
 * Props interface for the Input component extending native HTML input attributes
 */
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** Unique identifier for the input and associated elements */
  id: string;
  /** Accessible label text for the input */
  label?: string;
  /** Error message for validation failures */
  error?: string;
  /** Helper text providing additional context */
  hint?: string;
  /** Icon to display at start of input field */
  startIcon?: IconName;
  /** Icon to display at end of input field */
  endIcon?: IconName;
  /** Loading state indicator for async validation */
  isLoading?: boolean;
  /** Input mask pattern for formatted data */
  mask?: string;
}

/**
 * A reusable form input component that provides consistent styling, validation,
 * and accessibility features across the Arena MVP application.
 *
 * @example
 * ```tsx
 * <Input
 *   id="email"
 *   label="Email Address"
 *   type="email"
 *   required
 *   startIcon={IconName.USER}
 *   error={emailError}
 *   hint="Enter your business email address"
 * />
 * ```
 */
const Input: React.FC<InputProps> = ({
  id,
  label,
  error,
  hint,
  startIcon,
  endIcon,
  isLoading = false,
  mask,
  className,
  onChange,
  onKeyDown,
  maxLength = TEXT_INPUT_VALIDATION.MAX_LENGTH,
  required,
  disabled,
  value = '',
  type = 'text',
  ...restProps
}) => {
  // Generate unique IDs for associated elements
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Handle input masking if mask pattern is provided
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = event.target.value;

    if (mask) {
      // Apply mask pattern to input value
      newValue = newValue.replace(/\D/g, ''); // Remove non-digits
      let maskedValue = '';
      let maskIndex = 0;
      let valueIndex = 0;

      while (maskIndex < mask.length && valueIndex < newValue.length) {
        if (mask[maskIndex] === '#') {
          maskedValue += newValue[valueIndex];
          valueIndex++;
        } else {
          maskedValue += mask[maskIndex];
        }
        maskIndex++;
      }
      
      // Update input value with masked version
      event.target.value = maskedValue;
    }

    // Trim whitespace if configured
    if (TEXT_INPUT_VALIDATION.TRIM_WHITESPACE) {
      event.target.value = event.target.value.trim();
    }

    onChange?.(event);
  }, [mask, onChange]);

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow escape key to blur input
    if (event.key === 'Escape') {
      inputRef.current?.blur();
    }
    onKeyDown?.(event);
  }, [onKeyDown]);

  // Construct conditional class names
  const containerClasses = clsx(
    'relative w-full',
    className
  );

  const labelClasses = clsx(
    'block text-sm font-medium mb-1',
    error ? 'text-red-700' : 'text-gray-700'
  );

  const inputClasses = clsx(
    'block w-full rounded-md shadow-sm sm:text-sm',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    {
      'border-gray-300 focus:border-blue-500 focus:ring-blue-500': !error,
      'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500': error,
      'pl-10': startIcon,
      'pr-10': endIcon || isLoading,
      'bg-gray-100 cursor-not-allowed': disabled,
      'ring-2 ring-blue-500': isFocused && !error,
      'ring-2 ring-red-500': isFocused && error,
    }
  );

  return (
    <div className={containerClasses}>
      {/* Input Label */}
      {label && (
        <label 
          htmlFor={id}
          className={labelClasses}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Start Icon */}
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon
              name={startIcon}
              size={16}
              className={error ? 'text-red-500' : 'text-gray-400'}
              title={`${label} icon`}
            />
          </div>
        )}

        {/* Input Element */}
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-errormessage={error ? errorId : undefined}
          aria-describedby={clsx(hint && hintId, error && errorId)}
          className={inputClasses}
          {...restProps}
        />

        {/* End Icon or Loading Spinner */}
        {(endIcon || isLoading) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isLoading ? (
              <Icon
                name={IconName.ARROW_RIGHT}
                size={16}
                className="animate-spin text-gray-400"
                title="Loading"
              />
            ) : (
              <Icon
                name={endIcon!}
                size={16}
                className={error ? 'text-red-500' : 'text-gray-400'}
                title={`${label} icon`}
              />
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {/* Hint Text */}
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

export default Input;