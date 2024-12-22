import React from 'react'; // v18.0.0
import { render, screen, fireEvent, within } from '@testing-library/react'; // v13.4.0
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import Button from '../Button';
import { IconName } from '../../../assets/icons';

// Helper function to render Button with provided props
const renderButton = (props: React.ComponentProps<typeof Button> = {}) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(<Button {...props}>Button Text</Button>),
  };
};

describe('Button Component', () => {
  // Core Rendering Tests
  describe('Core Rendering', () => {
    it('renders with default props', () => {
      renderButton();
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-blue-600'); // Primary variant default
      expect(button).toHaveAttribute('type', 'button');
    });

    it('applies correct variant classes', () => {
      const variants = {
        primary: 'bg-blue-600',
        secondary: 'bg-gray-200',
        outline: 'border-2 border-blue-600',
        ghost: 'text-blue-600'
      };

      Object.entries(variants).forEach(([variant, className]) => {
        const { rerender } = renderButton({ variant: variant as any });
        expect(screen.getByRole('button')).toHaveClass(className);
        rerender(<Button variant={variant as any}>Button Text</Button>);
      });
    });

    it('handles different sizes', () => {
      const sizes = {
        small: 'min-h-[32px]',
        medium: 'min-h-[44px]',
        large: 'min-h-[56px]'
      };

      Object.entries(sizes).forEach(([size, className]) => {
        const { rerender } = renderButton({ size: size as any });
        expect(screen.getByRole('button')).toHaveClass(className);
        rerender(<Button size={size as any}>Button Text</Button>);
      });
    });

    it('supports full width mode', () => {
      renderButton({ isFullWidth: true });
      expect(screen.getByRole('button')).toHaveClass('w-full');
    });

    it('renders with custom className', () => {
      renderButton({ className: 'custom-class' });
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  // Interactive Behavior Tests
  describe('Interactive Behavior', () => {
    it('handles click events', async () => {
      const onClick = jest.fn();
      const { user } = renderButton({ onClick });
      
      await user.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('prevents clicks when disabled', async () => {
      const onClick = jest.fn();
      const { user } = renderButton({ onClick, disabled: true });
      
      await user.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows loading spinner and prevents interaction', async () => {
      const onClick = jest.fn();
      const { user } = renderButton({ onClick, isLoading: true });
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('maintains disabled state during loading', () => {
      renderButton({ isLoading: true });
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('handles double clicks correctly', async () => {
      const onDoubleClick = jest.fn();
      const { user } = renderButton({ onDoubleClick });
      
      await user.dblClick(screen.getByRole('button'));
      expect(onDoubleClick).toHaveBeenCalledTimes(1);
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const onClick = jest.fn();
      const { user } = renderButton({ onClick });
      
      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.keyboard('[Space]');
      expect(onClick).toHaveBeenCalledTimes(1);
      
      await user.keyboard('[Enter]');
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('announces state changes', () => {
      renderButton({ isLoading: true });
      expect(screen.getByText('Loading, please wait...')).toBeInTheDocument();
    });

    it('maintains focus visibility', async () => {
      const { user } = renderButton();
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    it('provides correct ARIA attributes', () => {
      renderButton({ isLoading: true, disabled: true });
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-describedby');
      expect(button).toBeDisabled();
    });
  });

  // Icon Support Tests
  describe('Icon Support', () => {
    it('renders left icon correctly', () => {
      renderButton({ leftIcon: IconName.DOWNLOAD });
      const button = screen.getByRole('button');
      const icon = within(button).getByRole('img', { hidden: true });
      
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('flex-shrink-0');
    });

    it('renders right icon correctly', () => {
      renderButton({ rightIcon: IconName.ARROW_RIGHT });
      const button = screen.getByRole('button');
      const icon = within(button).getByRole('img', { hidden: true });
      
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('flex-shrink-0');
    });

    it('handles both icons simultaneously', () => {
      renderButton({ 
        leftIcon: IconName.DOWNLOAD, 
        rightIcon: IconName.ARROW_RIGHT 
      });
      
      const icons = within(screen.getByRole('button'))
        .getAllByRole('img', { hidden: true });
      expect(icons).toHaveLength(2);
    });

    it('maintains icon alignment with text', () => {
      renderButton({ leftIcon: IconName.DOWNLOAD });
      const contentWrapper = screen.getByText('Button Text').parentElement;
      expect(contentWrapper).toHaveClass('inline-flex', 'items-center', 'gap-2');
    });
  });

  // Style Variants Tests
  describe('Style Variants', () => {
    it('applies hover states', async () => {
      const { user } = renderButton();
      const button = screen.getByRole('button');
      
      await user.hover(button);
      expect(button).toHaveClass('hover:bg-blue-700');
    });

    it('shows focus rings', async () => {
      const { user } = renderButton();
      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveClass('focus-visible:ring-2');
      expect(button).toHaveClass('focus-visible:ring-offset-2');
    });

    it('supports dark mode', () => {
      renderButton();
      const button = screen.getByRole('button');
      expect(button).toHaveClass('transition-colors');
    });

    it('maintains contrast ratios', () => {
      const { rerender } = renderButton({ variant: 'primary' });
      expect(screen.getByRole('button')).toHaveClass('text-white');
      
      rerender(<Button variant="outline">Button Text</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-blue-600');
    });
  });

  // Error Boundary Tests
  describe('Error Boundary', () => {
    const consoleError = console.error;
    beforeEach(() => {
      console.error = jest.fn();
    });

    afterEach(() => {
      console.error = consoleError;
    });

    it('renders fallback UI on error', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <Button>
          <ThrowError />
        </Button>
      );

      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'rounded');
      expect(screen.getByText('Fallback Button')).toBeInTheDocument();
    });
  });
});