/**
 * PlantLifecycle — Visual timeline of a plant's lifecycle stages.
 *
 * Per FrontEnd.md §2.9.
 */

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { fontFamily, typeScale, spacing, neutral, text } from '../tokens';
import { PlantSeedling, PlantVegetative, PlantFlowering, HarvestBundle } from '../icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlantStage =
  | 'seed'
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'harvested'
  | 'destroyed';

export interface LifecycleStageInfo {
  stage: PlantStage;
  date?: string | Date;
  note?: string;
}

export interface PlantLifecycleProps {
  currentStage: PlantStage;
  stages?: LifecycleStageInfo[];
  direction?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  showDates?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORDERED_STAGES: PlantStage[] = [
  'seed',
  'seedling',
  'vegetative',
  'flowering',
  'harvested',
  'destroyed',
];

const STAGE_LABELS: Record<PlantStage, string> = {
  seed: 'Seed',
  seedling: 'Seedling',
  vegetative: 'Vegetative',
  flowering: 'Flowering',
  harvested: 'Harvested',
  destroyed: 'Destroyed',
};

const COMPLETED_COLOR = '#007A4D';
const FUTURE_COLOR = '#D9D9D9';

const ICON_SIZE_MAP = { sm: 'sm', md: 'md' } as const;

// ---------------------------------------------------------------------------
// Global keyframes injection (same pattern as DataFreshness)
// ---------------------------------------------------------------------------

const LIFECYCLE_STYLE_ID = 'ncts-lifecycle-keyframes';

const lifecycleKeyframes = `
@keyframes ncts-lifecycle-pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 122, 77, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(0, 122, 77, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 122, 77, 0); }
}
`;

function useLifecycleKeyframes() {
  useEffect(() => {
    if (document.getElementById(LIFECYCLE_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = LIFECYCLE_STYLE_ID;
    style.textContent = lifecycleKeyframes;
    document.head.appendChild(style);
  }, []);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stageIndex(stage: PlantStage): number {
  return ORDERED_STAGES.indexOf(stage);
}

function getStageIcon(stage: PlantStage, size: 'sm' | 'md'): ReactNode {
  const iconSize = ICON_SIZE_MAP[size];
  const lucidePx = size === 'sm' ? 16 : 20;

  switch (stage) {
    case 'seed':
    case 'seedling':
      return <PlantSeedling size={iconSize} />;
    case 'vegetative':
      return <PlantVegetative size={iconSize} />;
    case 'flowering':
      return <PlantFlowering size={iconSize} />;
    case 'harvested':
      return <HarvestBundle size={iconSize} />;
    case 'destroyed':
      return <Trash2 size={lucidePx} />;
  }
}

type StageStatus = 'completed' | 'current' | 'future';

function getStageStatus(stage: PlantStage, currentStage: PlantStage): StageStatus {
  const ci = stageIndex(currentStage);
  const si = stageIndex(stage);
  if (si < ci) return 'completed';
  if (si === ci) return 'current';
  return 'future';
}

function formatDate(d: string | Date): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Dimension helpers
// ---------------------------------------------------------------------------

interface SizeDimensions {
  circle: number;
  currentCircle: number;
  lineThickness: number;
  iconCircle: number;
}

function getDimensions(size: 'sm' | 'md'): SizeDimensions {
  return size === 'sm'
    ? { circle: 28, currentCircle: 34, lineThickness: 2, iconCircle: 28 }
    : { circle: 36, currentCircle: 44, lineThickness: 2, iconCircle: 36 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlantLifecycle({
  currentStage,
  stages,
  direction = 'horizontal',
  size = 'md',
  showDates = false,
  className,
}: PlantLifecycleProps) {
  useLifecycleKeyframes();

  const dims = getDimensions(size);
  const stageInfoMap = new Map<PlantStage, LifecycleStageInfo>();
  if (stages) {
    for (const s of stages) {
      stageInfoMap.set(s.stage, s);
    }
  }

  const isHorizontal = direction === 'horizontal';

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    alignItems: isHorizontal ? 'flex-start' : 'flex-start',
    gap: 0,
    fontFamily: fontFamily.body,
    width: '100%',
  };

  return (
    <div
      role="group"
      aria-label="Plant lifecycle stages"
      className={className}
      style={containerStyle}
    >
      {ORDERED_STAGES.map((stage, idx) => {
        const status = getStageStatus(stage, currentStage);
        const info = stageInfoMap.get(stage);
        const isLast = idx === ORDERED_STAGES.length - 1;

        return (
          <StageItem
            key={stage}
            stage={stage}
            status={status}
            info={info}
            isLast={isLast}
            isHorizontal={isHorizontal}
            size={size}
            dims={dims}
            showDates={showDates}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StageItem — individual stage node + connector
// ---------------------------------------------------------------------------

interface StageItemProps {
  stage: PlantStage;
  status: StageStatus;
  info?: LifecycleStageInfo;
  isLast: boolean;
  isHorizontal: boolean;
  size: 'sm' | 'md';
  dims: SizeDimensions;
  showDates: boolean;
}

function StageItem({
  stage,
  status,
  info,
  isLast,
  isHorizontal,
  size,
  dims,
  showDates,
}: StageItemProps) {
  const isCurrent = status === 'current';
  const isCompleted = status === 'completed';
  const circleSize = isCurrent ? dims.currentCircle : dims.circle;

  const circleColor = status === 'future' ? FUTURE_COLOR : COMPLETED_COLOR;
  const iconColor = status === 'future' ? neutral[400] : '#FFFFFF';

  const typeStyle = size === 'sm' ? typeScale['body-sm'] : typeScale['body'];

  // --- circle style ---
  const circleStyle: CSSProperties = {
    width: circleSize,
    height: circleSize,
    minWidth: circleSize,
    minHeight: circleSize,
    borderRadius: '50%',
    backgroundColor: circleColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: iconColor,
    position: 'relative',
    transition: 'all 0.25s ease',
    ...(isCurrent
      ? { animation: 'ncts-lifecycle-pulse 2s ease-in-out infinite' }
      : {}),
  };

  // --- connector line ---
  const connectorStyle: CSSProperties = isHorizontal
    ? {
        flex: 1,
        height: dims.lineThickness,
        minWidth: spacing[2],
        alignSelf: 'center',
        backgroundColor: isCompleted ? COMPLETED_COLOR : 'transparent',
        borderTop:
          isCompleted
            ? 'none'
            : `${dims.lineThickness}px dashed ${FUTURE_COLOR}`,
      }
    : {
        width: dims.lineThickness,
        minHeight: spacing[4],
        flex: 1,
        alignSelf: 'center',
        backgroundColor: isCompleted ? COMPLETED_COLOR : 'transparent',
        borderLeft:
          isCompleted
            ? 'none'
            : `${dims.lineThickness}px dashed ${FUTURE_COLOR}`,
      };

  // --- label ---
  const labelStyle: CSSProperties = {
    fontSize: typeStyle.fontSize,
    fontWeight: isCurrent ? 700 : typeStyle.fontWeight,
    lineHeight: typeStyle.lineHeight,
    letterSpacing: typeStyle.letterSpacing,
    color: status === 'future' ? text.disabled : text.primary,
    marginTop: isHorizontal ? spacing[1] : 0,
    marginLeft: isHorizontal ? 0 : spacing[2],
    textAlign: isHorizontal ? 'center' : 'left',
    whiteSpace: 'nowrap',
  };

  // --- date ---
  const dateStyle: CSSProperties = {
    fontSize: typeScale['caption'].fontSize,
    fontWeight: typeScale['caption'].fontWeight,
    lineHeight: typeScale['caption'].lineHeight,
    color: text.secondary,
    marginTop: 2,
    textAlign: isHorizontal ? 'center' : 'left',
    whiteSpace: 'nowrap',
  };

  // --- wrapper for node column in horizontal ---
  if (isHorizontal) {
    return (
      <>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: circleSize,
          }}
          {...(isCurrent ? { 'aria-current': 'step' as const } : {})}
        >
          <div style={circleStyle}>
            {getStageIcon(stage, size)}
          </div>
          <span style={labelStyle}>{STAGE_LABELS[stage]}</span>
          {showDates && info?.date && (
            <span style={dateStyle}>{formatDate(info.date)}</span>
          )}
          {info?.note && (
            <span style={{ ...dateStyle, fontStyle: 'italic' }}>{info.note}</span>
          )}
        </div>
        {!isLast && <div style={connectorStyle} />}
      </>
    );
  }

  // vertical layout
  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
        {...(isCurrent ? { 'aria-current': 'step' as const } : {})}
      >
        <div style={circleStyle}>
          {getStageIcon(stage, size)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: spacing[2] }}>
          <span style={labelStyle}>{STAGE_LABELS[stage]}</span>
          {showDates && info?.date && (
            <span style={dateStyle}>{formatDate(info.date)}</span>
          )}
          {info?.note && (
            <span style={{ ...dateStyle, fontStyle: 'italic' }}>{info.note}</span>
          )}
        </div>
      </div>
      {!isLast && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: circleSize,
          }}
        >
          <div style={connectorStyle} />
        </div>
      )}
    </>
  );
}
