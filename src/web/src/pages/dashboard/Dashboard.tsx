import React, { useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.0.0
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { useAnalytics } from '@arena/analytics'; // v1.0.0
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { IconName } from '../../assets/icons';
import { ROUTES } from '../../constants/routes';
import clsx from 'clsx'; // v2.0.0

/**
 * Main dashboard component implementing F-pattern layout with role-based content
 * and enhanced accessibility features.
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isBuyer, isArenaStaff } = useAuth();
  const analytics = useAnalytics();

  // Handle request click with analytics tracking
  const handleRequestClick = useCallback((requestId: string) => {
    analytics.track('request_clicked', { requestId });
    navigate(ROUTES.REQUESTS.DETAILS.replace(':id', requestId));
  }, [analytics, navigate]);

  // Handle proposal click with analytics tracking
  const handleProposalClick = useCallback((proposalId: string) => {
    analytics.track('proposal_clicked', { proposalId });
    navigate(ROUTES.PROPOSALS.DETAILS.replace(':id', proposalId));
  }, [analytics, navigate]);

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-8 min-h-screen">
        {/* Welcome Section */}
        <section 
          className="bg-white rounded-lg shadow-sm p-6"
          aria-labelledby="welcome-heading"
        >
          <h1 
            id="welcome-heading"
            className="text-2xl font-semibold text-gray-900"
          >
            Welcome back, {user?.name}
          </h1>
          <p className="mt-2 text-gray-600">
            {isBuyer() ? 
              'Manage your software evaluation requests and review proposals.' :
              'Monitor and manage software evaluation requests from buyers.'
            }
          </p>
        </section>

        {/* Quick Actions */}
        <section 
          className="bg-white rounded-lg shadow-sm p-6"
          aria-labelledby="quick-actions-heading"
        >
          <h2 
            id="quick-actions-heading"
            className="text-lg font-semibold text-gray-900 mb-4"
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="primary"
              leftIcon={IconName.ADD}
              onClick={() => navigate(ROUTES.REQUESTS.CREATE)}
              isFullWidth
            >
              Create New Request
            </Button>
            <Button
              variant="secondary"
              leftIcon={IconName.SEARCH}
              onClick={() => navigate(ROUTES.REQUESTS.LIST)}
              isFullWidth
            >
              View All Requests
            </Button>
          </div>
        </section>

        {/* Role-Based Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Requests */}
          <Suspense 
            fallback={
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Loading size="lg" />
              </div>
            }
          >
            <section
              className="bg-white rounded-lg shadow-sm"
              aria-labelledby="recent-requests-heading"
            >
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 
                  id="recent-requests-heading"
                  className="text-lg font-semibold text-gray-900"
                >
                  Recent Requests
                </h2>
              </div>
              <div className="px-6 py-6">
                {/* Request list would be rendered here */}
                <div className="space-y-4">
                  {/* Placeholder for request items */}
                  <p className="text-gray-600 text-center py-4">
                    No recent requests found.
                  </p>
                </div>
              </div>
            </section>
          </Suspense>

          {/* Recent Proposals */}
          <Suspense
            fallback={
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Loading size="lg" />
              </div>
            }
          >
            <section
              className="bg-white rounded-lg shadow-sm"
              aria-labelledby="recent-proposals-heading"
            >
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 
                  id="recent-proposals-heading"
                  className="text-lg font-semibold text-gray-900"
                >
                  Recent Proposals
                </h2>
              </div>
              <div className="px-6 py-6">
                {/* Proposal list would be rendered here */}
                <div className="space-y-4">
                  {/* Placeholder for proposal items */}
                  <p className="text-gray-600 text-center py-4">
                    No recent proposals found.
                  </p>
                </div>
              </div>
            </section>
          </Suspense>
        </div>

        {/* Staff-Only Analytics Section */}
        {isArenaStaff() && (
          <section
            className={clsx(
              'bg-white rounded-lg shadow-sm p-6',
              'transition-all duration-300 ease-in-out'
            )}
            aria-labelledby="analytics-heading"
          >
            <h2 
              id="analytics-heading"
              className="text-lg font-semibold text-gray-900 mb-4"
            >
              Platform Analytics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Analytics cards would be rendered here */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Active Requests</p>
                <p className="text-2xl font-semibold mt-1">0</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Pending Proposals</p>
                <p className="text-2xl font-semibold mt-1">0</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-semibold mt-1">0%</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;