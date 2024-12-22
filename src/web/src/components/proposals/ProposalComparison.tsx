import React, { useMemo, useCallback } from 'react'; // v18.0.0
import clsx from 'clsx'; // v2.0.0
import { Table, Column } from '../common/Table';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { IconName } from '../../assets/icons';
import type { Proposal, ProposalDocument, ProposalStatus } from '../../types/proposals';
import type { DataClassification } from '../../types/common';

/**
 * Props interface for the ProposalComparison component
 */
interface ProposalComparisonProps {
  /** Array of proposals to compare */
  proposals: Proposal[];
  /** Async handler for accepting a proposal */
  onAccept: (proposalId: string) => Promise<void>;
  /** Async handler for rejecting a proposal with reason */
  onReject: (proposalId: string, reason: string) => Promise<void>;
  /** Optional CSS class names */
  className?: string;
  /** Data sensitivity level for content handling */
  dataClassification?: DataClassification;
}

/**
 * Enhanced interface for feature comparison data
 */
interface ComparisonFeature {
  name: string;
  category: string;
  supported: boolean;
  details?: string;
  comparisonMetrics?: Record<string, number>;
}

/**
 * Formats proposal pricing with security considerations
 */
const formatPrice = (
  pricing: Proposal['pricing'],
  sensitivity: DataClassification = 'PUBLIC'
): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  // Mask sensitive pricing for non-public data
  if (sensitivity !== 'PUBLIC') {
    return '(Contact for pricing)';
  }

  const basePrice = formatter.format(pricing.basePrice);
  const frequency = pricing.billingFrequency.toLowerCase();
  
  return `${basePrice}/${frequency}`;
};

/**
 * Generates enhanced feature comparison matrix
 */
const compareFeatures = (
  proposals: Proposal[],
  categories: string[]
): Record<string, ComparisonFeature[]> => {
  const featureMap: Record<string, ComparisonFeature[]> = {};

  categories.forEach(category => {
    featureMap[category] = proposals.reduce<ComparisonFeature[]>((features, proposal) => {
      const vendorFeatures = proposal.pricing.additionalCosts;
      
      Object.entries(vendorFeatures).forEach(([name, cost]) => {
        const existingFeature = features.find(f => f.name === name);
        
        if (!existingFeature) {
          features.push({
            name,
            category,
            supported: true,
            details: cost > 0 ? `Additional cost: ${formatPrice({ ...proposal.pricing, basePrice: cost })}` : 'Included',
            comparisonMetrics: { cost }
          });
        }
      });

      return features;
    }, []);
  });

  return featureMap;
};

/**
 * A secure and accessible proposal comparison component that enables side-by-side
 * evaluation of vendor proposals with standardized metrics and enhanced privacy controls.
 */
const ProposalComparison: React.FC<ProposalComparisonProps> = ({
  proposals,
  onAccept,
  onReject,
  className,
  dataClassification = 'PUBLIC'
}) => {
  // Generate unique ID for accessibility
  const tableId = React.useId();

  // Memoize feature categories and comparison data
  const featureCategories = useMemo(() => [
    'Core Features',
    'Integration',
    'Support',
    'Security'
  ], []);

  const comparisonData = useMemo(() => 
    compareFeatures(proposals, featureCategories),
    [proposals, featureCategories]
  );

  // Table columns configuration
  const columns: Column<Proposal>[] = useMemo(() => [
    {
      key: 'vendor',
      header: 'Vendor',
      accessor: (proposal) => proposal.vendorId,
      className: 'font-medium'
    },
    {
      key: 'pricing',
      header: 'Pricing',
      accessor: (proposal) => formatPrice(proposal.pricing, dataClassification),
      className: 'text-right'
    },
    {
      key: 'features',
      header: 'Features',
      accessor: (proposal) => (
        <div className="space-y-2">
          {featureCategories.map(category => (
            <div key={category} className="text-sm">
              <strong>{category}:</strong>
              <ul className="list-disc list-inside ml-4">
                {comparisonData[category]
                  .filter(feature => feature.supported)
                  .map(feature => (
                    <li key={feature.name}>
                      {feature.name}
                      {feature.details && (
                        <span className="text-gray-500 ml-2">
                          ({feature.details})
                        </span>
                      )}
                    </li>
                  ))
                }
              </ul>
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (proposal) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="primary"
            size="small"
            onClick={() => onAccept(proposal.id)}
            disabled={proposal.status === ProposalStatus.ACCEPTED}
            leftIcon={IconName.CHECK}
          >
            Accept
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={() => onReject(proposal.id, '')}
            disabled={proposal.status === ProposalStatus.REJECTED}
            leftIcon={IconName.CLOSE}
          >
            Reject
          </Button>
        </div>
      )
    }
  ], [comparisonData, featureCategories, onAccept, onReject, dataClassification]);

  return (
    <div 
      className={clsx(
        'w-full space-y-4',
        'focus-within:outline-none',
        className
      )}
    >
      <Card
        title="Proposal Comparison"
        className="overflow-hidden"
      >
        <Table
          columns={columns}
          data={proposals}
          className="w-full"
          emptyState={{
            title: "No proposals to compare",
            description: "Wait for vendors to submit their proposals",
            icon: IconName.INFO
          }}
        />
      </Card>

      {/* Accessibility note for screen readers */}
      <div className="sr-only" role="note">
        {proposals.length} proposals available for comparison. 
        Use arrow keys to navigate between proposals and their features.
      </div>
    </div>
  );
};

// Error boundary for production resilience
class ProposalComparisonErrorBoundary extends React.Component<
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
      return (
        <Card className="p-4 text-center">
          <p className="text-gray-900">
            Unable to load proposal comparison. Please try again later.
          </p>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary
export default React.memo(function WrappedProposalComparison(props: ProposalComparisonProps) {
  return (
    <ProposalComparisonErrorBoundary>
      <ProposalComparison {...props} />
    </ProposalComparisonErrorBoundary>
  );
});