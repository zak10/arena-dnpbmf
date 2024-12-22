// @ts-check
import React from 'react'; // v18.0.0

/**
 * Enumeration of all available icon names in the application.
 * Used for type-safe icon selection throughout the app.
 */
export enum IconName {
  CLOSE = 'CLOSE',
  CHECK = 'CHECK',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  SEARCH = 'SEARCH',
  FILTER = 'FILTER',
  SORT = 'SORT',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  MENU = 'MENU',
  USER = 'USER',
  SETTINGS = 'SETTINGS',
  LOGOUT = 'LOGOUT',
  ARROW_LEFT = 'ARROW_LEFT',
  ARROW_RIGHT = 'ARROW_RIGHT',
  ARROW_UP = 'ARROW_UP',
  ARROW_DOWN = 'ARROW_DOWN',
  CHEVRON_LEFT = 'CHEVRON_LEFT',
  CHEVRON_RIGHT = 'CHEVRON_RIGHT',
  CHEVRON_UP = 'CHEVRON_UP',
  CHEVRON_DOWN = 'CHEVRON_DOWN'
}

/**
 * Type definition for standardized icon sizes following 8px grid system.
 * All values are multiples of 8 to maintain consistent spacing.
 */
export type IconSize = 16 | 24 | 32 | 40 | 48;

/**
 * Default size for icons following 8px grid system
 */
export const DEFAULT_ICON_SIZE: IconSize = 24;

/**
 * Default color value for icons
 */
export const DEFAULT_ICON_COLOR = 'currentColor';

/**
 * Base props interface for all icon components with standardized properties
 * for consistent styling and behavior across the application.
 */
export interface IconProps {
  /**
   * Icon size following 8px grid system
   * @default 24
   */
  size?: IconSize;
  
  /**
   * Icon color using Tailwind CSS color classes or hex values
   * @default 'currentColor'
   */
  color?: string;
  
  /**
   * Additional CSS classes for custom styling
   */
  className?: string;
  
  /**
   * Accessibility label for screen readers
   */
  ariaLabel?: string;
}

// Import all SVG icon components
import CloseIcon from './Close';
import CheckIcon from './Check';
import ErrorIcon from './Error';
import WarningIcon from './Warning';
import InfoIcon from './Info';
import UploadIcon from './Upload';
import DownloadIcon from './Download';
import SearchIcon from './Search';
import FilterIcon from './Filter';
import SortIcon from './Sort';
import EditIcon from './Edit';
import DeleteIcon from './Delete';
import AddIcon from './Add';
import RemoveIcon from './Remove';
import MenuIcon from './Menu';
import UserIcon from './User';
import SettingsIcon from './Settings';
import LogoutIcon from './Logout';
import ArrowLeftIcon from './ArrowLeft';
import ArrowRightIcon from './ArrowRight';
import ArrowUpIcon from './ArrowUp';
import ArrowDownIcon from './ArrowDown';
import ChevronLeftIcon from './ChevronLeft';
import ChevronRightIcon from './ChevronRight';
import ChevronUpIcon from './ChevronUp';
import ChevronDownIcon from './ChevronDown';

/**
 * Type-safe map of icon components indexed by IconName.
 * Provides a centralized access point for all icon components.
 */
export const icons: Record<IconName, React.FC<IconProps>> = {
  [IconName.CLOSE]: CloseIcon,
  [IconName.CHECK]: CheckIcon,
  [IconName.ERROR]: ErrorIcon,
  [IconName.WARNING]: WarningIcon,
  [IconName.INFO]: InfoIcon,
  [IconName.UPLOAD]: UploadIcon,
  [IconName.DOWNLOAD]: DownloadIcon,
  [IconName.SEARCH]: SearchIcon,
  [IconName.FILTER]: FilterIcon,
  [IconName.SORT]: SortIcon,
  [IconName.EDIT]: EditIcon,
  [IconName.DELETE]: DeleteIcon,
  [IconName.ADD]: AddIcon,
  [IconName.REMOVE]: RemoveIcon,
  [IconName.MENU]: MenuIcon,
  [IconName.USER]: UserIcon,
  [IconName.SETTINGS]: SettingsIcon,
  [IconName.LOGOUT]: LogoutIcon,
  [IconName.ARROW_LEFT]: ArrowLeftIcon,
  [IconName.ARROW_RIGHT]: ArrowRightIcon,
  [IconName.ARROW_UP]: ArrowUpIcon,
  [IconName.ARROW_DOWN]: ArrowDownIcon,
  [IconName.CHEVRON_LEFT]: ChevronLeftIcon,
  [IconName.CHEVRON_RIGHT]: ChevronRightIcon,
  [IconName.CHEVRON_UP]: ChevronUpIcon,
  [IconName.CHEVRON_DOWN]: ChevronDownIcon
};

// Export individual icon components for direct imports
export {
  CloseIcon,
  CheckIcon,
  ErrorIcon,
  WarningIcon,
  InfoIcon,
  UploadIcon,
  DownloadIcon,
  SearchIcon,
  FilterIcon,
  SortIcon,
  EditIcon,
  DeleteIcon,
  AddIcon,
  RemoveIcon,
  MenuIcon,
  UserIcon,
  SettingsIcon,
  LogoutIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon
};