import React, { useCallback, useState, useRef, useEffect } from 'react';
import classNames from 'classnames';
import '../styles/components.css';

/**
 * Props interface for the Checkbox component following WCAG 2.1 Level AA standards
 */
interface CheckboxProps {
  /** Unique identifier for the checkbox */
  id: string;
  /** Name attribute for form submission */
  name: string;
  /** Label text displayed next to checkbox */
  label: string;
  /** Controlled checked state */
  checked?: boolean;
  /** Initial checked state for uncontrolled mode */
  defaultChecked?: boolean;
  /** Disables the checkbox when true */
  disabled?: boolean;
  /** Error message for invalid state */
  error?: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback fired when checkbox state changes */
  onChange?: (checked: boolean) => void;
  /** Indicates if the field is required */
  required?: boolean;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Theme preference */
  theme?: 'light' | 'dark' | 'system';
}

/**
 * A highly accessible checkbox component that supports both controlled and uncontrolled modes.
 * Implements WCAG 2.1 Level AA compliance with full keyboard navigation and screen reader support.
 * 
 * @version 1.0.0
 * @example
 * ```tsx
 * <Checkbox
 *   id="terms"
 *   name="terms"
 *   label="I accept the terms"
 *   required
 *   onChange={(checked) => console.log('Checked:', checked)}
 * />
 * ```
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  name,
  label,
  checked,
  defaultChecked,
  disabled = false,
  error,
  className,
  onChange,
  required = false,
  ariaLabel,
  theme = 'system'
}) => {
  // Internal state for uncontrolled mode
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Determine if component is controlled
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  // Effect to sync theme with system preference
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  /**
   * Handles checkbox state changes with proper event handling
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    const newChecked = event.target.checked;

    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalChecked(newChecked);
    }

    // Call onChange handler if provided
    onChange?.(newChecked);
  }, [disabled, isControlled, onChange]);

  /**
   * Handles keyboard interactions for accessibility
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      
      const newChecked = !isChecked;
      
      if (!isControlled) {
        setInternalChecked(newChecked);
      }
      
      onChange?.(newChecked);
      
      // Ensure focus is maintained
      inputRef.current?.focus();
    }
  }, [disabled, isChecked, isControlled, onChange]);

  // Generate unique IDs for accessibility
  const errorId = error ? `${id}-error` : undefined;
  const labelId = `${id}-label`;

  return (
    <div 
      className={classNames(
        'relative flex items-center',
        className,
        { 'opacity-60 cursor-not-allowed': disabled }
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        id={id}
        name={name}
        checked={isChecked}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        required={required}
        aria-checked={isChecked}
        aria-invalid={!!error}
        aria-describedby={errorId}
        aria-labelledby={labelId}
        aria-label={ariaLabel}
        className={classNames(
          'form-checkbox',
          'h-5 w-5',
          'border-2 rounded',
          'focus:ring-2 focus:ring-offset-2',
          'transition-colors duration-200',
          {
            'border-error': error,
            'cursor-not-allowed': disabled,
            'border-primary': !error && !disabled,
          }
        )}
      />
      <label
        id={labelId}
        htmlFor={id}
        className={classNames(
          'ml-2 text-sm font-medium',
          { 'cursor-not-allowed': disabled }
        )}
      >
        {label}
        {required && (
          <span className="ml-1 text-error" aria-hidden="true">*</span>
        )}
      </label>
      {error && (
        <span
          id={errorId}
          className="absolute -bottom-5 left-0 text-sm text-error"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
};

// Export for usage in other components
export default Checkbox;