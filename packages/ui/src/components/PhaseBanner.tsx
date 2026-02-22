import { useState, useCallback, useEffect } from 'react';
import { Tag, Button } from 'antd';
import { X } from 'lucide-react';
import { semantic, text as textTokens, breakpoints } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Phase = 'pilot' | 'beta';

export interface PhaseBannerProps {
  /** Current system phase */
  phase: Phase;
  /** Custom message override */
  message?: string;
  /** Feedback URL or handler */
  feedbackHref?: string;
  onFeedback?: () => void;
  /** Storage key for dismiss state. Default: 'ncts-phase-banner-dismissed' */
  storageKey?: string;
  /** App version string to reset dismiss on version change */
  appVersion?: string;
}

// ---------------------------------------------------------------------------
// Phase config
// ---------------------------------------------------------------------------

const phaseConfig: Record<Phase, {
  tag: string;
  tagColor: string;
  background: string;
  border: string;
  defaultMessage: string;
}> = {
  pilot: {
    tag: 'PILOT',
    tagColor: '#0958D9',
    background: semantic.info.bg,
    border: semantic.info.border,
    defaultMessage: 'This system is in pilot phase. Your feedback helps improve it.',
  },
  beta: {
    tag: 'BETA',
    tagColor: '#D46B08',
    background: '#FFF7E6',
    border: '#FFD591',
    defaultMessage: 'This system is in beta. Some features may change.',
  },
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  banner: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 24px',
    fontFamily: 'inherit',
    fontSize: 14,
    color: textTokens.primary,
    gap: 12,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
    flex: 1,
    minWidth: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  feedbackLink: {
    color: semantic.info.text,
    textDecoration: 'none',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PhaseBanner({
  phase,
  message: customMessage,
  feedbackHref,
  onFeedback,
  storageKey = 'ncts-phase-banner-dismissed',
  appVersion,
}: PhaseBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < breakpoints.md);
  }, []);

  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [checkMobile]);

  // Check localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // If version matches stored version, keep dismissed
        if (!appVersion || parsed.version === appVersion) {
          setDismissed(true);
        } else {
          // Version changed — show again
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey, appVersion]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ dismissed: true, version: appVersion ?? '' }),
      );
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey, appVersion]);

  if (dismissed) return null;

  const config = phaseConfig[phase];
  const displayMessage = customMessage ?? config.defaultMessage;

  return (
    <div
      role="status"
      style={{
        ...styles.banner,
        background: config.background,
        borderBottom: `1px solid ${config.border}`,
      }}
    >
      {/* Left: Tag + message */}
      <div style={styles.left}>
        <Tag color={config.tagColor} style={{ margin: 0, fontWeight: 600 }}>
          {config.tag}
        </Tag>
        <span>{displayMessage}</span>
      </div>

      {/* Right: Feedback link + dismiss */}
      <div style={styles.right}>
        {(feedbackHref || onFeedback) && (
          <a
            href={feedbackHref ?? '#'}
            onClick={(e) => {
              if (onFeedback) {
                e.preventDefault();
                onFeedback();
              }
            }}
            style={styles.feedbackLink}
          >
            {isMobile ? 'Feedback' : 'Give feedback →'}
          </a>
        )}
        <Button
          type="text"
          size="small"
          icon={<X size={16} />}
          aria-label="Dismiss phase banner"
          onClick={handleDismiss}
          style={{ color: textTokens.secondary }}
        />
      </div>
    </div>
  );
}
