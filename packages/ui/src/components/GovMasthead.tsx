import { useCallback, useEffect, useState } from 'react';
import { primary, fontFamily, breakpoints, zIndex } from '../tokens';
import { SaCoatOfArms } from '../icons/SaCoatOfArms';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GovMastheadProps {
  /** Government body name. Default: "Republic of South Africa" */
  governmentName?: string;
  /** System name. Default: "Official Cannabis Tracking System" */
  systemName?: string;
  /** Custom coat of arms SVG component */
  coatOfArms?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Styles — inline to avoid external CSS dependency
// ---------------------------------------------------------------------------

const styles = {
  masthead: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    background: primary[500],
    color: '#FFFFFF',
    fontFamily: fontFamily.body,
    zIndex: zIndex.masthead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  desktopMasthead: {
    height: 40,
    padding: '0 24px',
    fontSize: 12,
    fontWeight: 500,
  },
  mobileMasthead: {
    height: 32,
    padding: '0 16px',
    fontSize: 12,
    fontWeight: 500,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 500,
  },
  skipLink: {
    position: 'absolute' as const,
    left: -9999,
    top: 'auto',
    width: 1,
    height: 1,
    overflow: 'hidden',
    fontSize: 14,
    background: '#FFFFFF',
    color: primary[500],
    padding: '8px 16px',
    zIndex: 9999,
    textDecoration: 'underline',
  },
  skipLinkFocused: {
    position: 'static' as const,
    width: 'auto' as const,
    height: 'auto' as const,
    overflow: 'visible' as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GovMasthead({
  governmentName = 'Republic of South Africa',
  systemName = 'Official Cannabis Tracking System',
  coatOfArms,
  className,
}: GovMastheadProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isExtraSmall, setIsExtraSmall] = useState(false);
  const [skipFocused, setSkipFocused] = useState(false);

  const checkBreakpoint = useCallback(() => {
    const w = window.innerWidth;
    setIsMobile(w < breakpoints.md);
    setIsExtraSmall(w < breakpoints.sm);
  }, []);

  useEffect(() => {
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, [checkBreakpoint]);

  const mobileGovName = 'RSA';
  const mobileSystemName = isExtraSmall ? undefined : 'Official System';
  const displayGovName = isMobile ? mobileGovName : governmentName;
  const displaySystemName = isMobile ? mobileSystemName : systemName;

  const responsiveStyles = isMobile ? styles.mobileMasthead : styles.desktopMasthead;

  return (
    <div
      role="banner"
      aria-label="South African government official system identifier"
      className={className}
      style={{ ...styles.masthead, ...responsiveStyles }}
    >
      {/* Skip navigation link — first focusable element */}
      <a
        href="#main-content"
        style={skipFocused ? { ...styles.skipLink, ...styles.skipLinkFocused } : styles.skipLink}
        onFocus={() => setSkipFocused(true)}
        onBlur={() => setSkipFocused(false)}
      >
        Skip to main content
      </a>

      {/* Left: Coat of arms + government name */}
      <div style={styles.left}>
        {coatOfArms ?? <SaCoatOfArms size={isMobile ? 'sm' : 'md'} aria-hidden="true" />}
        <span>{displayGovName}</span>
      </div>

      {/* Right: System identifier */}
      {displaySystemName && (
        <div style={styles.right}>
          <span>{displaySystemName}</span>
        </div>
      )}
    </div>
  );
}
