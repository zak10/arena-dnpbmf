import React from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { Menu, Transition } from '@headlessui/react'; // v1.7.0
import { Button } from './Button';
import { Icon } from './Icon';
import { IconName } from '../../assets/icons';

/**
 * Interface for dropdown menu items with support for nested items
 */
interface DropdownItem {
  label: string;
  icon?: IconName;
  onClick: () => void;
  disabled?: boolean;
  children?: DropdownItem[];
}

/**
 * Props interface for the Dropdown component
 */
interface DropdownProps {
  /** Custom trigger element, defaults to Button */
  trigger?: React.ReactNode;
  /** Array of items to show in dropdown menu */
  items: DropdownItem[];
  /** Menu placement relative to trigger */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  /** Width of dropdown menu in pixels */
  width?: number;
  /** Additional CSS classes */
  className?: string;
  /** Enable RTL layout support */
  isRtl?: boolean;
  /** Enable nested dropdown behavior */
  isNested?: boolean;
  /** Duration of open/close animation in ms */
  transitionDuration?: number;
}

/**
 * A fully accessible dropdown menu component following Arena design system.
 * Supports keyboard navigation, RTL layouts, and mobile optimization.
 *
 * @example
 * ```tsx
 * <Dropdown
 *   items={[
 *     { label: 'Edit', icon: IconName.EDIT, onClick: () => {} },
 *     { label: 'Delete', icon: IconName.DELETE, onClick: () => {}, disabled: true }
 *   ]}
 * />
 * ```
 */
const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  placement = 'bottom-start',
  width,
  className,
  isRtl = false,
  isNested = false,
  transitionDuration = 200,
}) => {
  // Generate unique ID for ARIA labelling
  const menuId = React.useId();

  // Handle keyboard navigation for nested menus
  const handleKeyDown = (event: React.KeyboardEvent, item: DropdownItem) => {
    if (item.children && event.key === (isRtl ? 'ArrowLeft' : 'ArrowRight')) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Calculate menu position styles based on placement
  const getMenuStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      minWidth: '200px',
      width: width ? `${width}px` : undefined,
    };

    if (placement.includes('end')) {
      styles.right = 0;
    }
    if (placement.includes('top')) {
      styles.bottom = '100%';
      styles.marginBottom = '0.5rem';
    } else {
      styles.top = '100%';
      styles.marginTop = '0.5rem';
    }

    return styles;
  };

  // Render a single menu item
  const renderMenuItem = (item: DropdownItem, index: number) => (
    <Menu.Item key={`${item.label}-${index}`} disabled={item.disabled}>
      {({ active, disabled }) => (
        <button
          type="button"
          onClick={item.onClick}
          disabled={disabled}
          className={clsx(
            'group flex w-full items-center px-4 py-2 text-sm min-h-[44px]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'transition-colors duration-150',
            {
              'bg-gray-100': active,
              'text-gray-900': !disabled,
              'text-gray-400 cursor-not-allowed': disabled,
              'rtl:flex-row-reverse': isRtl,
            }
          )}
          role="menuitem"
          onKeyDown={(e) => handleKeyDown(e, item)}
        >
          {/* Item icon */}
          {item.icon && (
            <Icon
              name={item.icon}
              size={16}
              className={clsx(
                'flex-shrink-0',
                isRtl ? 'ml-3' : 'mr-3',
                disabled ? 'text-gray-400' : 'text-gray-500'
              )}
              aria-hidden="true"
            />
          )}

          {/* Item label */}
          <span className="flex-grow truncate">{item.label}</span>

          {/* Nested menu indicator */}
          {item.children && (
            <Icon
              name={isRtl ? IconName.CHEVRON_LEFT : IconName.CHEVRON_RIGHT}
              size={16}
              className={clsx(
                'flex-shrink-0',
                isRtl ? 'mr-auto' : 'ml-auto',
                disabled ? 'text-gray-400' : 'text-gray-500'
              )}
              aria-hidden="true"
            />
          )}
        </button>
      )}
    </Menu.Item>
  );

  return (
    <Menu as="div" className={clsx('relative inline-block text-left', className)}>
      {({ open }) => (
        <>
          {/* Menu trigger */}
          <Menu.Button as={React.Fragment}>
            {trigger || (
              <Button
                variant="secondary"
                rightIcon={open ? IconName.CHEVRON_UP : IconName.CHEVRON_DOWN}
                aria-expanded={open}
                aria-controls={menuId}
                aria-haspopup="true"
              >
                Menu
              </Button>
            )}
          </Menu.Button>

          {/* Dropdown menu */}
          <Transition
            show={open}
            as={React.Fragment}
            enter={`transition ease-out duration-${transitionDuration}`}
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave={`transition ease-in duration-${transitionDuration}`}
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              id={menuId}
              static
              className={clsx(
                'absolute z-50',
                'bg-white rounded-md shadow-lg',
                'ring-1 ring-black ring-opacity-5',
                'focus:outline-none',
                'divide-y divide-gray-100',
                isRtl && 'rtl'
              )}
              style={getMenuStyles()}
            >
              <div className="py-1" role="none">
                {items.map((item, index) => renderMenuItem(item, index))}
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

/**
 * Error boundary for production resilience
 */
class DropdownErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <div role="menu" className="inline-block" />;
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary
export default React.memo(function WrappedDropdown(props: DropdownProps) {
  return (
    <DropdownErrorBoundary>
      <Dropdown {...props} />
    </DropdownErrorBoundary>
  );
});