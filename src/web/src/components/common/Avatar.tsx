import React, { useState } from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import Icon from './Icon';
import { IconName } from '../../assets/icons';

/**
 * Valid avatar sizes following the 8px grid system
 */
export type AvatarSize = 32 | 40 | 48 | 56;

/**
 * Props interface for the Avatar component
 */
export interface AvatarProps {
  /** URL of the avatar image */
  src?: string;
  /** User's full name for generating initials fallback */
  name: string;
  /** Size of the avatar following 8px grid */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Extracts initials from a user's full name
 * @param name - Full name to extract initials from
 * @returns Up to two characters representing the initials
 */
const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  const firstInitial = words[0]?.[0] || '';
  const lastInitial = words.length > 1 ? words[words.length - 1]?.[0] : '';
  return (firstInitial + lastInitial).toUpperCase();
};

/**
 * A reusable avatar component that displays either a user's image or their initials
 * as a fallback. Follows the Arena MVP design system with consistent sizing and styling.
 *
 * @example
 * ```tsx
 * <Avatar name="John Doe" src="/path/to/avatar.jpg" size={40} />
 * ```
 */
const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 40,
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  // Calculate text size based on avatar size
  const getTextSize = (avatarSize: AvatarSize): string => {
    const sizes: Record<AvatarSize, string> = {
      32: 'text-xs',
      40: 'text-sm',
      48: 'text-base',
      56: 'text-lg',
    };
    return sizes[avatarSize];
  };

  // Common styles for the avatar container
  const containerClasses = clsx(
    'rounded-full overflow-hidden flex items-center justify-center',
    {
      'bg-gray-100': src && !imageError, // Background for images
      'bg-primary-50': (!src || imageError), // Background for initials
    },
    className
  );

  // Handle image loading errors
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div
      className={containerClasses}
      style={{
        width: size,
        height: size,
      }}
      role="img"
      aria-label={`Avatar for ${name}`}
      data-testid="avatar"
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={`${name}'s avatar`}
          className="w-full h-full object-cover"
          onError={handleImageError}
          data-testid="avatar-image"
        />
      ) : name ? (
        <span
          className={clsx(
            'font-medium text-primary-700',
            getTextSize(size)
          )}
          data-testid="avatar-initials"
        >
          {getInitials(name)}
        </span>
      ) : (
        <Icon
          name={IconName.USER}
          size={Math.floor(size * 0.6)}
          className="text-gray-400"
          title="Default user avatar"
        />
      )}
    </div>
  );
};

export default Avatar;