import React from 'react'; // v18.0.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v13.4.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import Modal from '../Modal';

// Mock ResizeObserver for DOM testing
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Helper function to render Modal with default props
const renderModal = async (props: Partial<React.ComponentProps<typeof Modal>> = {}) => {
  const user = userEvent.setup();
  const onClose = jest.fn();
  
  const defaultProps = {
    isOpen: true,
    onClose,
    title: 'Test Modal',
    children: <div>Modal content</div>,
    ...props,
  };

  const result = render(<Modal {...defaultProps} />);
  
  // Wait for modal to be fully rendered
  if (defaultProps.isOpen) {
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  }

  return {
    ...result,
    user,
    onClose,
  };
};

describe('Modal Component', () => {
  describe('Rendering', () => {
    it('renders modal content when isOpen is true', async () => {
      await renderModal();
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      
      // Verify title and content
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
      
      // Verify close button
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('does not render when isOpen is false', async () => {
      await renderModal({ isOpen: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('applies correct size classes', async () => {
      const sizes = {
        small: 'w-[480px]',
        medium: 'w-[640px]',
        large: 'w-[800px]',
      };

      for (const [size, expectedClass] of Object.entries(sizes)) {
        const { rerender } = await renderModal({ size: size as 'small' | 'medium' | 'large' });
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass(expectedClass);
        
        // Cleanup for next iteration
        rerender(<div />);
      }
    });
  });

  describe('Accessibility', () => {
    it('manages focus trap correctly', async () => {
      const { user } = await renderModal();
      
      // Get all focusable elements
      const dialog = screen.getByRole('dialog');
      const focusableElements = within(dialog).getAllByRole('button');
      
      // Initial focus should be on close button
      expect(focusableElements[0]).toHaveFocus();
      
      // Tab should cycle through focusable elements
      await user.tab();
      expect(focusableElements[focusableElements.length - 1]).toHaveFocus();
      
      // Shift+Tab should cycle backwards
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(focusableElements[0]).toHaveFocus();
    });

    it('has correct ARIA attributes', async () => {
      await renderModal();
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
      
      // Verify label and description references
      const labelId = dialog.getAttribute('aria-labelledby');
      const descriptionId = dialog.getAttribute('aria-describedby');
      
      expect(screen.getByText('Test Modal')).toHaveAttribute('id', labelId);
      expect(screen.getByText('Modal content').parentElement).toHaveAttribute('id', descriptionId);
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const { user, onClose } = await renderModal();
      
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked if closeOnBackdrop is true', async () => {
      const { user, onClose } = await renderModal({ closeOnBackdrop: true });
      
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when backdrop is clicked if closeOnBackdrop is false', async () => {
      const { user, onClose } = await renderModal({ closeOnBackdrop: false });
      
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed if closeOnEsc is true', async () => {
      const { user, onClose } = await renderModal({ closeOnEsc: true });
      
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when Escape key is pressed if closeOnEsc is false', async () => {
      const { user, onClose } = await renderModal({ closeOnEsc: false });
      
      await user.keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Animation', () => {
    it('applies enter animation classes when opening', async () => {
      await renderModal();
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('animate-modal-enter');
    });

    it('applies exit animation classes when closing', async () => {
      const { rerender } = await renderModal();
      
      // Close the modal
      rerender(<Modal isOpen={false} onClose={jest.fn()} title="Test Modal" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('animate-modal-exit');
    });

    it('calls onAnimationComplete after animation ends', async () => {
      const onAnimationComplete = jest.fn();
      await renderModal({ onAnimationComplete });
      
      // Wait for animation duration (200ms)
      await waitFor(() => {
        expect(onAnimationComplete).toHaveBeenCalledTimes(1);
      }, { timeout: 250 });
    });
  });
});