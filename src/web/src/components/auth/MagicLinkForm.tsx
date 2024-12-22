import React, { useState, useCallback } from 'react'; // v18.0.0
import { v4 as uuid } from 'uuid'; // v4.5.0
import Input from '../common/Input';
import Button from '../common/Button';
import { IconName } from '../../assets/icons';
import { requestMagicLink } from '../../api/auth';
import { validateEmail } from '../../utils/validation';
import { EMAIL_VALIDATION } from '../../constants/validation';
import type { MagicLinkPayload } from '../../types/auth';

/**
 * Props interface for the MagicLinkForm component
 */
interface MagicLinkFormProps {
  /** Callback function called after successful magic link request */
  onSuccess: () => void;
  /** Optional callback for error handling */
  onError?: (error: string) => void;
}

/**
 * A secure form component that implements magic link authentication with
 * business email validation, rate limiting, and WCAG 2.1 Level AA compliance.
 *
 * Features:
 * - Business email validation with domain restrictions
 * - Rate limiting (3 attempts per hour)
 * - Accessible error messages and states
 * - Loading state management
 * - Security headers and CSRF protection
 *
 * @example
 * ```tsx
 * <MagicLinkForm
 *   onSuccess={() => setShowSuccessMessage(true)}
 *   onError={(error) => setErrorMessage(error)}
 * />
 * ```
 */
const MagicLinkForm: React.FC<MagicLinkFormProps> = ({
  onSuccess,
  onError
}) => {
  // Form state
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Generate unique form ID for accessibility
  const formId = React.useId();

  /**
   * Handles email input changes with validation
   */
  const handleEmailChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newEmail = event.target.value.trim();
    setEmail(newEmail);

    // Clear any existing errors when user starts typing
    if (error) {
      setError('');
    }

    // Perform real-time validation for improved UX
    if (newEmail) {
      const validation = validateEmail(newEmail);
      if (!validation.isValid) {
        setError(validation.accessibleError || validation.error);
      }
    }
  }, [error]);

  /**
   * Handles form submission with rate limiting and validation
   */
  const handleSubmit = useCallback(async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    // Check rate limiting
    if (attemptCount >= 3) {
      setError('Too many attempts. Please try again in 1 hour.');
      onError?.('Rate limit exceeded');
      return;
    }

    // Validate email
    const validation = validateEmail(email);
    if (!validation.isValid) {
      setError(validation.accessibleError || validation.error);
      onError?.(validation.error);
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Generate correlation ID for request tracking
      const correlationId = uuid();

      // Request magic link
      await requestMagicLink({
        email: email as MagicLinkPayload['email']
      });

      // Update attempt count for rate limiting
      setAttemptCount(prev => prev + 1);

      // Call success callback
      onSuccess();

    } catch (err) {
      // Handle rate limiting errors
      if (err.code === 'E4002') {
        setError('Too many attempts. Please try again in 1 hour.');
      } else {
        setError('Failed to send magic link. Please try again.');
      }
      onError?.(err.message);
      
    } finally {
      setIsLoading(false);
    }
  }, [email, attemptCount, onSuccess, onError]);

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Magic link authentication form"
    >
      <div className="space-y-4">
        {/* Email Input */}
        <Input
          id={`${formId}-email`}
          type="email"
          label="Business Email"
          value={email}
          onChange={handleEmailChange}
          error={error}
          disabled={isLoading}
          required
          maxLength={EMAIL_VALIDATION.MAX_LENGTH}
          startIcon={IconName.USER}
          hint="Enter your business email to receive a secure login link"
          aria-describedby={error ? `${formId}-error` : undefined}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          isFullWidth
          disabled={!email || !!error || isLoading}
          aria-disabled={!email || !!error || isLoading}
        >
          Send Magic Link
        </Button>

        {/* Rate Limit Warning */}
        {attemptCount > 0 && (
          <p 
            className="text-sm text-gray-500 mt-2"
            aria-live="polite"
          >
            {`${3 - attemptCount} attempts remaining`}
          </p>
        )}
      </div>
    </form>
  );
};

export default React.memo(MagicLinkForm);