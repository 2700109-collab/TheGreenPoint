/**
 * SkeletonPage — Variant-based page skeleton loader.
 *
 * Renders an animated shimmer skeleton matching the approximate layout
 * of dashboard, table, detail, or form pages. Per FrontEnd.md §1.7 + §2.14.
 */

import { Skeleton, Card, Row, Col, Space } from 'antd';
import { useEffect, type CSSProperties } from 'react';
import { reducedMotion } from '../tokens';

const REDUCED_MOTION_ID = 'ncts-skeleton-reduced-motion';

/** Inject reduced-motion styles once (never removed — harmless global style). */
function useReducedMotionStyle() {
  useEffect(() => {
    if (document.getElementById(REDUCED_MOTION_ID)) return;
    const style = document.createElement('style');
    style.id = REDUCED_MOTION_ID;
    style.textContent = `${reducedMotion} { .ant-skeleton-content .ant-skeleton-title, .ant-skeleton-content .ant-skeleton-paragraph > li, .ant-skeleton-element .ant-skeleton-input, .ant-skeleton-element .ant-skeleton-button, .ant-skeleton-element .ant-skeleton-avatar { animation: none !important; } }`;
    document.head.appendChild(style);
    // No cleanup — avoids race condition when multiple SkeletonPages unmount.
  }, []);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkeletonVariant = 'dashboard' | 'table' | 'detail' | 'form';

export interface SkeletonPageProps {
  /** Page type to render appropriate skeleton */
  variant: SkeletonVariant;
  /** Number of table rows (for 'table' variant) */
  rows?: number;
  /** Number of stat cards (for 'dashboard' variant) */
  cards?: number;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const shimmerBlock: CSSProperties = {
  borderRadius: 6,
  marginBottom: 16,
};

// ---------------------------------------------------------------------------
// Variant renderers
// ---------------------------------------------------------------------------

function DashboardSkeleton({ cards = 4 }: { cards: number }) {
  return (
    <div>
      {/* Stat cards */}
      <Row gutter={[16, 16]}>
        {Array.from({ length: cards }).map((_, i) => (
          <Col key={i} xs={24} sm={12} lg={24 / cards}>
            <Card style={shimmerBlock}>
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Chart placeholders */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card style={{ ...shimmerBlock, minHeight: 240 }}>
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card style={{ ...shimmerBlock, minHeight: 240 }}>
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          </Card>
        </Col>
      </Row>

      {/* Table placeholder */}
      <Card style={{ ...shimmerBlock, marginTop: 16 }}>
        <Skeleton active paragraph={{ rows: 5 }} title={{ width: '40%' }} />
      </Card>
    </div>
  );
}

function TableSkeleton({ rows = 10 }: { rows: number }) {
  return (
    <Card style={shimmerBlock}>
      {/* Header row */}
      <Skeleton.Input active block style={{ height: 40, marginBottom: 8 }} />

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 8,
            alignItems: 'center',
          }}
        >
          <Skeleton.Input active style={{ width: 60, height: 20 }} />
          <Skeleton.Input active style={{ flex: 1, height: 20 }} />
          <Skeleton.Input active style={{ width: 120, height: 20 }} />
          <Skeleton.Input active style={{ width: 80, height: 20 }} />
          <Skeleton.Input active style={{ width: 80, height: 20 }} />
        </div>
      ))}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Skeleton.Input active style={{ width: 200, height: 32 }} />
      </div>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div>
      {/* Back button */}
      <Skeleton.Input active style={{ width: 80, height: 20, marginBottom: 16 }} />

      {/* Title + subtitle */}
      <Skeleton.Input active style={{ width: 300, height: 28, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
        <Skeleton.Input active style={{ width: 160, height: 20 }} />
        <Skeleton.Input active style={{ width: 80, height: 24, borderRadius: 12 }} />
      </div>

      {/* Detail grid — 2 columns, 8 rows */}
      <Card style={shimmerBlock}>
        <Row gutter={[24, 16]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Col key={i} xs={24} sm={12}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Skeleton.Input active style={{ width: 80, height: 14 }} />
                <Skeleton.Input active style={{ width: '70%', height: 20 }} />
              </Space>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Skeleton.Button active style={{ width: 120 }} />
        <Skeleton.Button active style={{ width: 100 }} />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div>
      {/* Title */}
      <Skeleton.Input active style={{ width: 250, height: 28, marginBottom: 16 }} />

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 32 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Skeleton.Avatar active size={24} />
            <Skeleton.Input active style={{ width: 60, height: 14 }} />
          </div>
        ))}
      </div>

      {/* Form fields */}
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ marginBottom: 24 }}>
          <Skeleton.Input active style={{ width: 100, height: 14, marginBottom: 8 }} />
          <Skeleton.Input active block style={{ height: 40 }} />
        </div>
      ))}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Skeleton.Button active style={{ width: 100 }} />
        <Skeleton.Button active style={{ width: 100 }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SkeletonPage({
  variant,
  rows = 10,
  cards = 4,
  className,
}: SkeletonPageProps) {
  useReducedMotionStyle();

  return (
    <div
      className={className}
      aria-busy="true"
      aria-label="Loading page content"
    >
      {variant === 'dashboard' && <DashboardSkeleton cards={cards} />}
      {variant === 'table' && <TableSkeleton rows={rows} />}
      {variant === 'detail' && <DetailSkeleton />}
      {variant === 'form' && <FormSkeleton />}
    </div>
  );
}
