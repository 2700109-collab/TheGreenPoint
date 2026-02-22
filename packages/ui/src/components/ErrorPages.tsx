/**
 * ErrorPages — Full-page error state components.
 *
 * Provides 404, 500, 403, and network error states per FrontEnd.md §1.8.
 */

import { Result, Button, Alert, Space } from 'antd';
import { RotateCw } from 'lucide-react';
import { text as textTokens, fontFamily } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorPageProps {
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Navigate to dashboard callback — injected by consuming app */
  onNavigateDashboard?: () => void;
  /** Additional class */
  className?: string;
}

export interface ServerErrorPageProps extends ErrorPageProps {
  /** Error reference code for support tickets */
  errorRef?: string;
}

export interface NetworkErrorProps {
  /** Retry function — typically query.refetch() */
  onRetry?: () => void;
  /** Custom message */
  message?: string;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// 404 — Not Found
// ---------------------------------------------------------------------------

export function NotFoundPage({
  title = 'Page Not Found',
  description = "The page you're looking for doesn't exist or has been moved.",
  onNavigateDashboard,
  className,
}: ErrorPageProps) {
  return (
    <div className={className} style={{ fontFamily: fontFamily.body }}>
      <Result
        status="404"
        title={title}
        subTitle={description}
        extra={
          onNavigateDashboard && (
            <Button type="primary" onClick={onNavigateDashboard}>
              ← Go to Dashboard
            </Button>
          )
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 500 — Server Error
// ---------------------------------------------------------------------------

export function ServerErrorPage({
  title = 'Something Went Wrong',
  description = "We're experiencing technical difficulties. Please try again.",
  errorRef,
  onNavigateDashboard,
  className,
}: ServerErrorPageProps) {
  return (
    <div className={className} style={{ fontFamily: fontFamily.body }}>
      <Result
        status="500"
        title={title}
        subTitle={
          <Space direction="vertical" size={8} style={{ textAlign: 'center' }}>
            <span>{description}</span>
            {errorRef && (
              <span style={{ fontSize: 12, color: textTokens.tertiary }}>
                Error reference: {errorRef}
              </span>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<RotateCw size={16} />}
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
            {onNavigateDashboard && (
              <Button onClick={onNavigateDashboard}>
                ← Go to Dashboard
              </Button>
            )}
          </Space>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 403 — Permission Denied
// ---------------------------------------------------------------------------

export function ForbiddenPage({
  title = 'Permission Denied',
  description = "You don't have permission to access this page. Contact your administrator if you believe this is an error.",
  onNavigateDashboard,
  className,
}: ErrorPageProps) {
  return (
    <div className={className} style={{ fontFamily: fontFamily.body }}>
      <Result
        status="403"
        title={title}
        subTitle={description}
        extra={
          onNavigateDashboard && (
            <Button type="primary" onClick={onNavigateDashboard}>
              ← Go to Dashboard
            </Button>
          )
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Network Error (Inline)
// ---------------------------------------------------------------------------

export function NetworkError({
  onRetry,
  message = 'Unable to load data. Check your connection and try again.',
  className,
}: NetworkErrorProps) {
  return (
    <Alert
      type="warning"
      showIcon
      message={message}
      className={className}
      action={
        onRetry && (
          <Button size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    />
  );
}
