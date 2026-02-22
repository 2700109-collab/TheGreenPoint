import { useState, useCallback, useEffect } from 'react';
import { Row, Col, Select, Typography, Collapse } from 'antd';
import { SaCoatOfArms } from '../icons/SaCoatOfArms';
import { NctsShield } from '../icons/NctsShield';
import { neutral, text as textTokens, primary, fontFamily, breakpoints } from '../tokens';

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface GovFooterProps {
  /** Link sections. Defaults to standard NCTS footer links */
  sections?: FooterSection[];
  /** Copyright year. Default: current year */
  copyrightYear?: number;
  /** Department name. Default: "Department of Health" */
  department?: string;
  /** Show language selector. Default: true */
  showLanguageSelector?: boolean;
  /** Current language code */
  language?: string;
  /** Language change handler */
  onLanguageChange?: (lang: string) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultSections: FooterSection[] = [
  {
    title: 'About',
    links: [
      { label: 'About NCTS', href: '/about' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'For Operators', href: '/for-operators' },
      { label: 'For Regulators', href: '/for-regulators' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'POPIA Notice', href: '/privacy' },
      { label: 'PAIA Manual', href: '/paia' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Accessibility', href: '/accessibility' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'Technical Support', href: '/support' },
      { label: 'ncts@health.gov.za', href: 'mailto:ncts@health.gov.za' },
      { label: '0800-NCTS (6287)', href: 'tel:08006287' },
      { label: 'Report an Issue', href: '/report-issue' },
    ],
  },
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'zu', label: 'isiZulu' },
  { value: 'xh', label: 'isiXhosa' },
  { value: 'st', label: 'Sesotho' },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  footer: {
    background: neutral[100],
    borderTop: `1px solid ${neutral[200]}`,
    fontFamily: fontFamily.body,
    padding: '64px 24px 32px',
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  branding: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: textTokens.primary,
    marginBottom: 12,
  },
  link: {
    display: 'block',
    color: textTokens.secondary,
    fontSize: 14,
    marginBottom: 8,
    textDecoration: 'none',
  },
  bottomBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: `1px solid ${neutral[200]}`,
    padding: '16px 0',
    marginTop: 32,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  copyright: {
    fontSize: 12,
    color: textTokens.tertiary,
  },
} as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FooterLinkItem({ link }: { link: FooterLink }) {
  const externalProps = link.external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <a href={link.href} style={styles.link} {...externalProps}>
      {link.label}
      {link.external && (
        <span
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
        >
          {' '}(opens in new tab)
        </span>
      )}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GovFooter({
  sections = defaultSections,
  copyrightYear = new Date().getFullYear(),
  department = 'Department of Health',
  showLanguageSelector = true,
  language = 'en',
  onLanguageChange,
}: GovFooterProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const checkBreakpoint = useCallback(() => {
    const w = window.innerWidth;
    setIsMobile(w < breakpoints.md);
    setIsTablet(w >= breakpoints.md && w < breakpoints.lg);
  }, []);

  useEffect(() => {
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, [checkBreakpoint]);

  // ---- Mobile: accordion layout ----
  if (isMobile) {
    return (
      <footer role="contentinfo" style={styles.footer}>
       <div style={styles.container}>
        {/* Branding */}
        <div style={styles.branding}>
          <NctsShield size="lg" style={{ color: primary[500] }} aria-hidden="true" />
          <div style={styles.brandText}>
            <Text strong style={{ fontSize: 16, color: primary[500] }}>NCTS</Text>
            <Text style={{ fontSize: 12, color: textTokens.secondary }}>{department}</Text>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <SaCoatOfArms size="sm" style={{ color: textTokens.tertiary }} aria-hidden="true" />
          <Text style={{ fontSize: 11, color: textTokens.tertiary }}>Republic of South Africa</Text>
        </div>

        {/* Accordion sections */}
        <Collapse
          ghost
          items={sections.map((section, i) => ({
            key: String(i),
            label: section.title,
            children: (
              <div>
                {section.links.map((link) => (
                  <FooterLinkItem key={link.href} link={link} />
                ))}
              </div>
            ),
          }))}
        />

        {/* Bottom bar */}
        <div style={styles.bottomBar}>
          <span style={styles.copyright}>
            © {copyrightYear} {department}, Republic of South Africa
          </span>
          {showLanguageSelector && (
            <Select
              size="small"
              value={language}
              onChange={onLanguageChange}
              options={languageOptions}
              style={{ width: 130 }}
              aria-label="Select language"
            />
          )}
        </div>
       </div>
      </footer>
    );
  }

  // ---- Desktop/Tablet: grid layout ----
  // Tablet: brand full-width, then 2×2 grid for link sections (span 12 each)
  // Desktop: 4 columns (brand span 6, 3 link sections span 6 each)
  const sectionSpan = isTablet ? 12 : 6;
  const brandSpan = isTablet ? 24 : 6;

  return (
    <footer role="contentinfo" style={styles.footer}>
     <div style={styles.container}>
      <Row gutter={[24, 24]}>
        {/* Branding column */}
        <Col span={brandSpan}>
          <div style={styles.branding}>
            <NctsShield size="lg" style={{ color: primary[500] }} aria-hidden="true" />
            <div style={styles.brandText}>
              <Text strong style={{ fontSize: 18, color: primary[500] }}>
                NCTS
              </Text>
              <Text style={{ fontSize: 12, color: textTokens.secondary }}>
                National Cannabis Tracking System
              </Text>
              <Text style={{ fontSize: 12, color: textTokens.tertiary, marginTop: 4 }}>
                {department}
              </Text>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <SaCoatOfArms size="md" style={{ color: textTokens.tertiary }} aria-hidden="true" />
            <Text style={{ fontSize: 11, color: textTokens.tertiary }}>
              Republic of South Africa
            </Text>
          </div>
        </Col>

        {/* Link sections */}
        {sections.map((section) => (
          <Col key={section.title} span={sectionSpan}>
            <div style={styles.sectionTitle}>{section.title}</div>
            {section.links.map((link) => (
              <FooterLinkItem key={link.href} link={link} />
            ))}
          </Col>
        ))}
      </Row>

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <span style={styles.copyright}>
          © {copyrightYear} {department}, Republic of South Africa. All rights reserved.
        </span>
        {showLanguageSelector && (
          <Select
            size="small"
            value={language}
            onChange={onLanguageChange}
            options={languageOptions}
            style={{ width: 150 }}
            aria-label="Select language"
          />
        )}
      </div>
     </div>
    </footer>
  );
}
