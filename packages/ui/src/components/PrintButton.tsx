/**
 * PrintButton — Triggers window.print() with injected @media print styles.
 *
 * Per FrontEnd.md §2.20.
 */

import { useEffect, type CSSProperties } from 'react';
import { Button } from 'antd';
import { Printer } from 'lucide-react';
import { fontFamily } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PrintButtonProps {
  /** Button label */
  label?: string;
  /** CSS selector to restrict what gets printed (e.g. '#invoice-section'). When omitted, the full page is printed. */
  contentSelector?: string;
  /** Override document.title in the print header. Restored after printing. */
  title?: string;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Print stylesheet
// ---------------------------------------------------------------------------

const PRINT_STYLE_ID = 'ncts-print-styles';

const PRINT_CSS = `
@media print {
  .ncts-masthead, .ncts-sidebar, .ncts-bottom-nav, .ncts-footer, .ncts-no-print { display: none !important; }
  .ncts-print-header { display: block !important; }
  body { font-size: 12pt; color: #000; background: #fff; }
  a[href]::after { content: " (" attr(href) ")"; font-size: 9pt; color: #595959; }
  .ant-table { page-break-inside: auto; }
  .ant-table-row { page-break-inside: avoid; }
}
`.trim();

function injectPrintStyles(): void {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = PRINT_CSS;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const btnStyle: CSSProperties = {
  fontFamily: fontFamily.body,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PrintButton({
  label = 'Print',
  contentSelector,
  title,
  className,
}: PrintButtonProps) {
  useEffect(() => {
    injectPrintStyles();
  }, []);

  const handleClick = () => {
    const prevTitle = document.title;

    // Optionally override page title for the print header
    if (title) {
      document.title = title;
    }

    // If a content selector is provided, hide everything else during print
    let scopeStyle: HTMLStyleElement | null = null;
    if (contentSelector) {
      scopeStyle = document.createElement('style');
      scopeStyle.id = 'ncts-print-scope';
      scopeStyle.textContent = [
        '@media print {',
        `  body > *:not(:has(${contentSelector})) { display: none !important; }`,
        `  ${contentSelector} { display: block !important; }`,
        `  ${contentSelector} * { visibility: visible !important; }`,
        '}',
      ].join('\n');
      document.head.appendChild(scopeStyle);
    }

    window.print();

    // Restore state after print dialog closes
    if (title) {
      document.title = prevTitle;
    }
    if (scopeStyle) {
      scopeStyle.remove();
    }
  };

  return (
    <Button
      type="default"
      icon={<Printer size={16} />}
      onClick={handleClick}
      className={className}
      style={btnStyle}
      aria-label="Print page content"
    >
      {label}
    </Button>
  );
}
