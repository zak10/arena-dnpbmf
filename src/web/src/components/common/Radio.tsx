import React, { useCallback, useRef } from 'react';
import classNames from 'classnames'; // v2.3.0
import '../styles/components.css';

/**
 * Interface for Radio component props following WCAG 2.1 Level AA compliance
 */
interface RadioProps {
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  name: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  className?: string;
  id?: string;
  required?: boolean;
  ariaDescribedBy?: string;
  groupRole?: string;
}

/**
 * Accessible Radio component that supports both light and dark themes
 * 
 * @component
 * @example
 * ```tsx
 * <Radio
 *   value="option1"
 *   checked={selectedValue === 'option1'}
 *   onChange={handleChange}
 *   label="Option 1"
 *   name="radioGroup"
 *   required
 * />
 * ```
 */
export const Radio: React.FC<RadioProps> = ({
  value,
  checked,
  onChange,
  label,
  name,
  disabled = false,
  error = false,
  errorMessage,
  className,
  id = `radio-${value}`,
  required = false,
  ariaDescribedBy,
  groupRole = 'radiogroup'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;

  /**
   * Handles radio button state changes with accessibility announcements
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (!disabled) {
      const newValue = event.target.value;
      onChange(newValue);

      // Announce change to screen readers
      const announcement = `Selected ${label}`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.setAttribute('class', 'sr-only');
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      setTimeout(() => document.body.removeChild(ariaLive), 1000);
    }
  }, [disabled, label, onChange]);

  /**
   * Manages keyboard interactions for accessibility
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        onChange(value);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        const nextInput = inputRef.current?.closest('form')
          ?.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]+* input[type="radio"]`);
        nextInput?.focus();
        nextInput?.click();
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        const prevInput = inputRef.current?.closest('form')
          ?.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"] input[type="radio"]`);
        prevInput?.focus();
        prevInput?.click();
        break;
      default:
        break;
    }
  }, [disabled, name, onChange, value]);

  const containerClasses = classNames(
    'radio-container',
    {
      'radio-disabled': disabled,
      'radio-error': error
    },
    className
  );

  const inputClasses = classNames(
    'radio-input',
    {
      'radio-input-error': error,
      'radio-input-disabled': disabled
    }
  );

  const labelClasses = classNames(
    'radio-label',
    {
      'radio-label-disabled': disabled,
      'radio-label-error': error
    }
  );

  return (
    <div className={containerClasses} role={groupRole}>
      <input
        ref={inputRef}
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        required={required}
        className={inputClasses}
        aria-describedby={classNames(
          error ? errorId : null,
          ariaDescribedBy
        )}
        aria-invalid={error}
        aria-required={required}
      />
      <label 
        htmlFor={id}
        className={labelClasses}
      >
        {label}
        {required && <span className="sr-only">(required)</span>}
      </label>
      {error && errorMessage && (
        <div
          id={errorId}
          className="radio-error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default Radio;