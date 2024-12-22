import React, { useCallback, useEffect, useRef, useState } from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import Icon from './Icon';
import { IconName } from '../../assets/icons';

// Interfaces
export interface SelectOption {
  value: string;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  loading?: boolean;
  maxHeight?: number;
  renderOption?: (option: SelectOption) => React.ReactNode;
  className?: string;
}

// Custom hooks
const useKeyboardNavigation = (
  options: SelectOption[],
  isOpen: boolean,
  onSelect: (option: SelectOption) => void
) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout>();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && !options[focusedIndex].disabled) {
          onSelect(options[focusedIndex]);
        }
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
      default:
        // Type to select functionality
        if (event.key.length === 1) {
          clearTimeout(searchTimeout.current);
          setSearchQuery(prev => prev + event.key);
          
          const matchingIndex = options.findIndex(option =>
            option.label.toLowerCase().startsWith(searchQuery.toLowerCase() + event.key)
          );
          
          if (matchingIndex >= 0) {
            setFocusedIndex(matchingIndex);
          }

          searchTimeout.current = setTimeout(() => {
            setSearchQuery('');
          }, 500);
        }
    }
  }, [isOpen, options, focusedIndex, onSelect, searchQuery]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(searchTimeout.current);
    };
  }, [handleKeyDown]);

  return { focusedIndex, setFocusedIndex };
};

const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, handler]);
};

// Helper function to get display value
const getDisplayValue = (
  value: string | string[],
  options: SelectOption[],
  multiple: boolean
): string => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return '';
  }

  if (multiple && Array.isArray(value)) {
    return `${value.length} selected`;
  }

  const selectedOption = options.find(option => 
    Array.isArray(value) ? value.includes(option.value) : option.value === value
  );
  
  return selectedOption?.label || '';
};

// Main component
const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Select an option',
  disabled = false,
  error,
  required = false,
  loading = false,
  maxHeight = 300,
  renderOption,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((option: SelectOption) => {
    if (option.disabled) return;

    if (multiple) {
      const newValue = Array.isArray(value) ? value : [];
      const index = newValue.indexOf(option.value);
      
      if (index === -1) {
        onChange([...newValue, option.value]);
      } else {
        onChange(newValue.filter(v => v !== option.value));
      }
    } else {
      onChange(option.value);
      setIsOpen(false);
    }
  }, [multiple, value, onChange]);

  const { focusedIndex, setFocusedIndex } = useKeyboardNavigation(
    options,
    isOpen,
    handleSelect
  );

  useClickOutside(selectRef, () => setIsOpen(false));

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && dropdownRef.current) {
      const focusedElement = dropdownRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const displayValue = getDisplayValue(value, options, multiple);

  return (
    <div
      ref={selectRef}
      className={clsx(
        'relative w-full',
        className
      )}
    >
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="select-dropdown"
        aria-label={placeholder}
        aria-required={required}
        aria-invalid={!!error}
        tabIndex={disabled ? -1 : 0}
        className={clsx(
          'flex items-center justify-between w-full px-3 py-2 border rounded-md',
          'transition-colors duration-200',
          {
            'cursor-pointer': !disabled,
            'cursor-not-allowed opacity-50': disabled,
            'border-red-500': error,
            'border-gray-300 hover:border-blue-500': !error && !disabled,
            'ring-2 ring-blue-500': isOpen && !error,
            'ring-2 ring-red-500': isOpen && error,
          }
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={e => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className={clsx(
          'truncate',
          !displayValue && 'text-gray-500'
        )}>
          {displayValue || placeholder}
        </span>
        
        <div className="flex items-center">
          {loading && (
            <Icon
              name={IconName.ARROW_UP}
              className="animate-spin mr-2"
              size={16}
            />
          )}
          <Icon
            name={isOpen ? IconName.CHEVRON_UP : IconName.CHEVRON_DOWN}
            size={16}
            className={clsx(
              'transition-transform',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {isOpen && (
        <div
          id="select-dropdown"
          role="listbox"
          aria-multiselectable={multiple}
          ref={dropdownRef}
          className={clsx(
            'absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg',
            'overflow-auto scrollbar-thin scrollbar-thumb-gray-300'
          )}
          style={{ maxHeight }}
        >
          {options.map((option, index) => {
            const isSelected = Array.isArray(value) 
              ? value.includes(option.value)
              : value === option.value;

            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                tabIndex={-1}
                className={clsx(
                  'px-3 py-2 cursor-pointer',
                  'transition-colors duration-200',
                  {
                    'bg-blue-50': focusedIndex === index,
                    'bg-blue-100': isSelected,
                    'opacity-50 cursor-not-allowed': option.disabled,
                    'hover:bg-blue-50': !option.disabled,
                  }
                )}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {renderOption ? (
                  renderOption(option)
                ) : (
                  <div className="flex items-center">
                    {option.icon && (
                      <Icon
                        name={option.icon}
                        size={16}
                        className="mr-2 flex-shrink-0"
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                    {multiple && isSelected && (
                      <Icon
                        name={IconName.CHECK}
                        size={16}
                        className="ml-auto flex-shrink-0"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Select;