import React, { useState, useCallback } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { primary } from '../tokens';

export interface FABAction {
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
}

export interface FABProps {
  /** Primary icon displayed on the FAB. */
  icon: React.ReactNode;
  /** Optional accessible label. */
  label?: string;
  /** Click handler for the primary button (only fires when there are no speed-dial actions). */
  onClick?: () => void;
  /** Speed-dial actions that fan out when the FAB is tapped. */
  actions?: FABAction[];
}

const FAB_SIZE = 56;
const MINI_SIZE = 44;

/**
 * Floating Action Button shown only on mobile viewports.
 * Positioned above the MobileBottomNav (bottom-right).
 * Optionally supports speed-dial sub-actions.
 */
export const FAB: React.FC<FABProps> = ({ icon, label, onClick, actions }) => {
  const { isMobile } = useBreakpoint();
  const [expanded, setExpanded] = useState(false);

  const handlePrimary = useCallback(() => {
    if (actions && actions.length > 0) {
      setExpanded((prev) => !prev);
    } else {
      onClick?.();
    }
  }, [actions, onClick]);

  const handleAction = useCallback(
    (action: FABAction) => {
      setExpanded(false);
      action.onClick();
    },
    [],
  );

  if (!isMobile) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 72, // above 56px MobileBottomNav + 16px gap
        right: 16,
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Primary FAB */}
      <button
        type="button"
        aria-label={label ?? 'Action'}
        onClick={handlePrimary}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: '50%',
          border: 'none',
          background: primary[500],
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          fontSize: 24,
          transition: 'transform 200ms ease',
          transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {icon}
      </button>

      {/* Speed-dial actions */}
      {expanded &&
        actions?.map((action, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={action.label ?? `Action ${idx + 1}`}
            onClick={() => handleAction(action)}
            style={{
              width: MINI_SIZE,
              height: MINI_SIZE,
              borderRadius: '50%',
              border: 'none',
              background: '#FFFFFF',
              color: primary[500],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              fontSize: 20,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {action.icon}
          </button>
        ))}
    </div>
  );
};
