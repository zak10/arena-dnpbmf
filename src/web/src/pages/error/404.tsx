import React from 'react'; // v18.0.0
import { useNavigate } from 'react-router-dom'; // v6.0.0
import EmptyState from '../../components/common/EmptyState';
import { ROUTES } from '../../constants/routes';
import { IconName } from '../../assets/icons';

/**
 * NotFoundPage component displays a user-friendly 404 error page when users
 * attempt to access non-existent routes. Implements WCAG 2.1 Level AA compliance
 * with proper ARIA landmarks and keyboard navigation support.
 *
 * @returns {JSX.Element} Rendered 404 page component
 */
const NotFoundPage: React.FC = () => {
  // Initialize navigation hook
  const navigate = useNavigate();

  /**
   * Handles navigation back to dashboard when action button is clicked
   */
  const handleBackToDashboard = React.useCallback(() => {
    navigate(ROUTES.DASHBOARD.INDEX);
  }, [navigate]);

  return (
    <main
      role="main"
      aria-label="Page not found"
      className={`
        min-h-screen
        flex
        items-center
        justify-center
        bg-gray-50
        dark:bg-gray-900
        px-4
        py-16
        sm:px-6
        sm:py-24
        md:grid
        md:place-items-center
        lg:px-8
      `}
    >
      <div className="max-w-max mx-auto">
        <EmptyState
          title="Page Not Found"
          description="Sorry, we couldn't find the page you're looking for. Please check the URL or return to the dashboard."
          icon={IconName.ERROR}
          actionButton={{
            text: "Back to Dashboard",
            onClick: handleBackToDashboard
          }}
          className="text-center"
        />
      </div>
    </main>
  );
};

/**
 * Error boundary for production resilience
 */
class NotFoundPageErrorBoundary extends React.Component<
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
      // Render minimal fallback UI in production
      return (
        <main role="main" className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Page Not Found</h1>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component with error boundary
export default React.memo(function WrappedNotFoundPage() {
  return (
    <NotFoundPageErrorBoundary>
      <NotFoundPage />
    </NotFoundPageErrorBoundary>
  );
});