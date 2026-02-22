/**
 * TransferTimeline — Visual timeline of transfer stages.
 *
 * Per FrontEnd.md §2.10.
 */

import React, { useEffect, type CSSProperties } from 'react';
import { Timeline } from 'antd';
import {
  ArrowRight,
  Truck,
  Navigation,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react';
import { fontFamily, typeScale, spacing, neutral, text } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelineEvent {
  stage: 'initiated' | 'dispatched' | 'in_transit' | 'received' | 'verified';
  timestamp?: string | Date;
  actor?: string;
  location?: string;
  note?: string;
}

export interface TransferTimelineProps {
  events: TimelineEvent[];
  currentStage: string;
  direction?: 'vertical' | 'horizontal';
  showActors?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORDERED_STAGES: TimelineEvent['stage'][] = [
  'initiated',
  'dispatched',
  'in_transit',
  'received',
  'verified',
];

const STAGE_LABELS: Record<TimelineEvent['stage'], string> = {
  initiated: 'Initiated',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  received: 'Received',
  verified: 'Verified',
};

const STAGE_ICONS: Record<TimelineEvent['stage'], typeof ArrowRight> = {
  initiated: ArrowRight,
  dispatched: Truck,
  in_transit: Navigation,
  received: PackageCheck,
  verified: ShieldCheck,
};

// Colors per spec
const COLOR_COMPLETED = '#007A4D';
const COLOR_CURRENT = '#0958D9';
const COLOR_PENDING = '#D9D9D9';

const ICON_SIZE = 16;

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

const KEYFRAMES_ID = 'ncts-timeline-keyframes';
const KEYFRAMES_CSS = `
@keyframes ncts-timeline-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(9, 88, 217, 0.45); }
  70%  { box-shadow: 0 0 0 8px rgba(9, 88, 217, 0); }
  100% { box-shadow: 0 0 0 0 rgba(9, 88, 217, 0); }
}
`;

type StageStatus = 'completed' | 'current' | 'pending';

function getStageStatus(
  stage: TimelineEvent['stage'],
  currentStage: string,
): StageStatus {
  const currentIdx = ORDERED_STAGES.indexOf(currentStage as TimelineEvent['stage']);
  const stageIdx = ORDERED_STAGES.indexOf(stage);
  if (currentIdx === -1) return 'pending';
  if (stageIdx < currentIdx) return 'completed';
  if (stageIdx === currentIdx) return 'current';
  return 'pending';
}

function dotStyle(status: StageStatus): CSSProperties {
  const base: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  };

  switch (status) {
    case 'completed':
      return {
        ...base,
        width: 28,
        height: 28,
        backgroundColor: COLOR_COMPLETED,
        color: '#FFFFFF',
      };
    case 'current':
      return {
        ...base,
        width: 32,
        height: 32,
        backgroundColor: COLOR_CURRENT,
        color: '#FFFFFF',
        animation: 'ncts-timeline-pulse 2s ease-in-out infinite',
      };
    case 'pending':
      return {
        ...base,
        width: 28,
        height: 28,
        backgroundColor: 'transparent',
        border: `2px solid ${COLOR_PENDING}`,
        color: COLOR_PENDING,
      };
  }
}

function labelStyle(status: StageStatus): CSSProperties {
  return {
    fontFamily: fontFamily.body,
    fontSize: typeScale['body'].fontSize,
    lineHeight: typeScale['body'].lineHeight,
    fontWeight: status === 'current' ? 700 : typeScale['body'].fontWeight,
    color:
      status === 'pending'
        ? neutral[400]
        : status === 'current'
          ? COLOR_CURRENT
          : text.primary,
    margin: 0,
  };
}

function formatTimestamp(ts: string | Date): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function isoString(ts: string | Date): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransferTimeline({
  events,
  currentStage,
  direction = 'vertical',
  showActors = false,
  className,
}: TransferTimelineProps): React.JSX.Element {
  // Inject keyframe styles once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(KEYFRAMES_ID)) return;
    const style = document.createElement('style');
    style.id = KEYFRAMES_ID;
    style.textContent = KEYFRAMES_CSS;
    document.head.appendChild(style);
  }, []);

  // Build lookup map for event data by stage
  const eventMap = new Map<string, TimelineEvent>();
  for (const ev of events) {
    eventMap.set(ev.stage, ev);
  }

  const items = ORDERED_STAGES.map((stage) => {
    const status = getStageStatus(stage, currentStage);
    const ev = eventMap.get(stage);
    const Icon = STAGE_ICONS[stage];

    const dot = (
      <span style={dotStyle(status)}>
        <Icon size={ICON_SIZE} strokeWidth={2} />
      </span>
    );

    const contentStyle: CSSProperties = {
      paddingBottom: spacing[4],
    };

    const actorStyle: CSSProperties = {
      fontFamily: fontFamily.body,
      fontSize: typeScale['body-sm'].fontSize,
      lineHeight: typeScale['body-sm'].lineHeight,
      color: status === 'pending' ? neutral[400] : text.secondary,
      margin: 0,
      marginTop: spacing[1],
    };

    const noteStyle: CSSProperties = {
      fontFamily: fontFamily.body,
      fontSize: typeScale['body-sm'].fontSize,
      lineHeight: typeScale['body-sm'].lineHeight,
      fontStyle: 'italic',
      color: status === 'pending' ? neutral[400] : text.tertiary,
      margin: 0,
      marginTop: spacing[1],
    };

    const timeStyle: CSSProperties = {
      fontFamily: fontFamily.body,
      fontSize: typeScale['caption'].fontSize,
      lineHeight: typeScale['caption'].lineHeight,
      color: status === 'pending' ? neutral[400] : text.tertiary,
      margin: 0,
      marginTop: spacing[1],
    };

    const isCurrent = status === 'current';

    const label = (
      <div
        style={contentStyle}
        role="article"
        aria-label={`${STAGE_LABELS[stage]} stage`}
        {...(isCurrent ? { 'aria-current': 'step' as const } : {})}
      >
        <p style={labelStyle(status)}>{STAGE_LABELS[stage]}</p>

        {ev?.timestamp != null && (
          <time dateTime={isoString(ev.timestamp)} style={timeStyle}>
            {formatTimestamp(ev.timestamp)}
          </time>
        )}

        {showActors && ev?.actor && (
          <p style={actorStyle}>
            by {ev.actor}
            {ev.location ? ` at ${ev.location}` : ''}
          </p>
        )}

        {ev?.note && <p style={noteStyle}>{ev.note}</p>}
      </div>
    );

    const color =
      status === 'completed'
        ? COLOR_COMPLETED
        : status === 'current'
          ? COLOR_CURRENT
          : COLOR_PENDING;

    return {
      dot,
      color,
      children: label,
      style:
        status === 'pending'
          ? ({ borderLeftStyle: 'dashed' } as CSSProperties)
          : undefined,
    };
  });

  const wrapperStyle: CSSProperties = {
    fontFamily: fontFamily.body,
  };

  return (
    <div
      role="feed"
      aria-label="Transfer timeline"
      className={className}
      style={wrapperStyle}
    >
      <Timeline
        mode={direction === 'horizontal' ? 'alternate' : 'left'}
        items={items}
      />
    </div>
  );
}
