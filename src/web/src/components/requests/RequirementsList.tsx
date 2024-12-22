import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx'; // v2.0.0
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LoadingState } from '../../types/common';

/**
 * Type definition for a single requirement
 */
interface Requirement {
  id: string;
  type: RequirementType;
  value: string;
  mandatory: boolean;
  category: RequirementCategory;
}

/**
 * Requirement type variants mapping to badge styles
 */
type RequirementType = 'functional' | 'technical' | 'business' | 'security' | 'other';

/**
 * Requirement categories for grouping
 */
type RequirementCategory = 'Core Features' | 'Implementation' | 'Security' | 'Business Rules' | 'Other';

/**
 * Props interface for the RequirementsList component
 */
interface RequirementsListProps {
  /** Request object containing parsed requirements */
  request: {
    id: string;
    requirements: Requirement[];
  };
  /** Optional additional CSS classes */
  className?: string;
  /** Whether requirements can be clicked/selected */
  interactive?: boolean;
  /** Loading state during requirement parsing */
  isLoading?: boolean;
  /** Callback for requirement selection */
  onRequirementSelect?: (id: string) => void;
}

/**
 * Mapping of requirement types to badge variants
 */
const REQUIREMENT_TYPE_VARIANTS = {
  functional: 'primary',
  technical: 'info',
  business: 'success',
  security: 'warning',
  other: 'default'
} as const;

/**
 * ARIA labels for accessibility
 */
const ARIA_LABELS = {
  list: 'Software Requirements List',
  item: 'Requirement Item',
  mandatory: 'Mandatory Requirement',
  category: 'Requirements Category'
} as const;

/**
 * Custom hook for managing requirements list state and interactions
 */
const useRequirementsList = ({
  request,
  interactive,
  onRequirementSelect
}: Pick<RequirementsListProps, 'request' | 'interactive' | 'onRequirementSelect'>) => {
  // Group requirements by category
  const groupedRequirements = useMemo(() => {
    return request.requirements.reduce((acc, requirement) => {
      const category = requirement.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(requirement);
      return acc;
    }, {} as Record<RequirementCategory, Requirement[]>);
  }, [request.requirements]);

  // Handle requirement selection
  const handleRequirementClick = useCallback((id: string) => {
    if (interactive && onRequirementSelect) {
      onRequirementSelect(id);
    }
  }, [interactive, onRequirementSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, id: string) => {
    if (interactive && onRequirementSelect && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onRequirementSelect(id);
    }
  }, [interactive, onRequirementSelect]);

  return {
    groupedRequirements,
    handleRequirementClick,
    handleKeyDown
  };
};

/**
 * RequirementsList component that displays parsed software requirements with
 * categorization, accessibility features, and responsive design.
 */
export const RequirementsList: React.FC<RequirementsListProps> = ({
  request,
  className,
  interactive = false,
  isLoading = false,
  onRequirementSelect
}) => {
  const {
    groupedRequirements,
    handleRequirementClick,
    handleKeyDown
  } = useRequirementsList({ request, interactive, onRequirementSelect });

  // Handle loading state
  if (isLoading) {
    return (
      <Card className={clsx('animate-pulse', className)}>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-6 bg-gray-200 rounded w-3/4" />
          ))}
        </div>
      </Card>
    );
  }

  // Handle empty state
  if (!request.requirements.length) {
    return (
      <Card className={clsx('text-center p-8', className)}>
        <p className="text-gray-500">No requirements found</p>
      </Card>
    );
  }

  return (
    <ErrorBoundary fallback={<div className="text-error">Error loading requirements</div>}>
      <div
        className={clsx('space-y-6', className)}
        role="region"
        aria-label={ARIA_LABELS.list}
      >
        {Object.entries(groupedRequirements).map(([category, requirements]) => (
          <Card
            key={category}
            title={
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium" aria-label={`${ARIA_LABELS.category}: ${category}`}>
                  {category}
                </h3>
                <Badge size="sm" variant="default">
                  {requirements.length}
                </Badge>
              </div>
            }
          >
            <ul className="space-y-3">
              {requirements.map((requirement) => (
                <li
                  key={requirement.id}
                  className={clsx(
                    'p-3 rounded-md border border-border',
                    'transition-colors duration-200',
                    interactive && 'hover:bg-gray-50 cursor-pointer',
                    'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2'
                  )}
                  onClick={() => handleRequirementClick(requirement.id)}
                  onKeyDown={(e) => handleKeyDown(e, requirement.id)}
                  tabIndex={interactive ? 0 : undefined}
                  role={interactive ? 'button' : 'listitem'}
                  aria-label={`${ARIA_LABELS.item}${requirement.mandatory ? `, ${ARIA_LABELS.mandatory}` : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Badge
                      variant={REQUIREMENT_TYPE_VARIANTS[requirement.type]}
                      size="sm"
                      className="mt-1"
                    >
                      {requirement.type}
                    </Badge>
                    <div className="flex-grow">
                      <p className="text-sm text-gray-900">{requirement.value}</p>
                      {requirement.mandatory && (
                        <span className="text-xs text-error mt-1">Required</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </ErrorBoundary>
  );
};

export default RequirementsList;