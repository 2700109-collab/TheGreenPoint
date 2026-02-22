# NCTS Frontend Master Plan

> **National Cannabis Tracking System — Republic of South Africa**
> **Document Version:** 1.1
> **Status:** DRAFT — Post-Review Revision
> **Last Updated:** 2026-02-21
> **Author:** Frontend Planning Agent (Phase 1)

---

## Table of Contents

- [Section 0: Design System Foundation](#section-0-design-system-foundation)
- [Section 1: Layout & Navigation System](#section-1-layout--navigation-system)
- [Section 2: Shared Components (`packages/ui/`)](#section-2-shared-components-packagesui)
- [Section 3: Operator Portal Pages (`apps/web/`)](#section-3-operator-portal-pages-appsweb)
- [Section 4: Government Dashboard Pages (`apps/admin/`)](#section-4-government-dashboard-pages-appsadmin)
- [Section 5: Public Verification App (`apps/verify/`)](#section-5-public-verification-app-appsverify)
- [Section 6: Advanced Features](#section-6-advanced-features)
- [Section 7: Mobile & Tablet Optimization](#section-7-mobile--tablet-optimization)
- [Section 8: Accessibility & Internationalization](#section-8-accessibility--internationalization)
- [Section 9: Authentication & Session Pages](#section-9-authentication--session-pages)
- [Section 10: Portal App Architecture Note](#section-10-portal-app-architecture-note)
- [Section 11: Chart Library Standardization](#section-11-chart-library-standardization)
- [Section 12: Missing API Hooks Gap List](#section-12-missing-api-hooks-gap-list)

---

## Design Principles

1. **Government-Grade Trust** — Visual cues (masthead, coat of arms, phase banner) establish this as an official RSA system.
2. **Operator Efficiency** — Data-dense tables with inline actions; minimize clicks for daily workflows.
3. **Rural-Ready** — Offline-first, low-bandwidth, works on Samsung Galaxy A-series (3-4 GB RAM).
4. **POPIA-Compliant** — Consent capture, data minimization, audit trails visible to operators.
5. **Accessible by Default** — WCAG 2.1 AA minimum; all interactive elements keyboard-navigable.
6. **SA Context** — 11 languages scaffold (English-only MVP), data-cost awareness, GPS capture for farm locations.

---

# Section 0: Design System Foundation

All tokens are defined in `packages/ui/src/tokens/` and consumed via Ant Design 5 theme config and CSS custom properties.

## 0.1 Color Palette

### Primary — Deep Blue (`#1B3A5C`)

| Token | Hex | Usage |
|---|---|---|
| `primary-50` | `#E8EDF3` | Hover backgrounds, selected row |
| `primary-100` | `#C5D2E1` | Light borders |
| `primary-200` | `#9FB3CC` | Disabled states on primary |
| `primary-300` | `#7994B6` | Secondary text on dark bg |
| `primary-400` | `#5C7DA5` | — |
| `primary-500` | `#1B3A5C` | **Primary actions, sidebar, masthead** |
| `primary-600` | `#173253` | Hover on primary |
| `primary-700` | `#122847` | Active/pressed on primary |
| `primary-800` | `#0E1E38` | — |
| `primary-900` | `#091428` | Darkest text on light bg |

### Secondary — SA Green (`#007A4D`)

| Token | Hex | Usage |
|---|---|---|
| `secondary-50` | `#E6F5EF` | Success background |
| `secondary-100` | `#B3E2D0` | — |
| `secondary-200` | `#80CEAF` | — |
| `secondary-300` | `#4DBA8E` | Plant active states |
| `secondary-400` | `#26AB77` | — |
| `secondary-500` | `#007A4D` | **SA green, verified badges, plant active** |
| `secondary-600` | `#006E45` | Hover |
| `secondary-700` | `#005E3B` | Active/pressed |
| `secondary-800` | `#004E31` | — |
| `secondary-900` | `#003822` | — |

### Accent — Gold (`#FFB81C`)

| Token | Hex | Usage |
|---|---|---|
| `accent-50` | `#FFF8E6` | Warning background |
| `accent-100` | `#FFECB3` | — |
| `accent-200` | `#FFE080` | — |
| `accent-300` | `#FFD44D` | Highlights |
| `accent-400` | `#FFCC33` | — |
| `accent-500` | `#FFB81C` | **Decorative accent only — NOT for text** |
| `accent-600` | `#E6A619` | — |
| `accent-700` | `#996E00` | **WCAG-safe accent text on white (4.56:1)** |
| `accent-800` | `#7A5800` | — |
| `accent-900` | `#5C4200` | — |

> ⚠️ **Critical:** `accent-500` (#FFB81C) on white has a contrast ratio of **1.94:1** — FAILS WCAG AA. Always use `accent-700` (#996E00) or darker for text. The 500 shade is for decorative backgrounds, borders, and icons on dark backgrounds only.

### Semantic Colors

| Purpose | Background | Border | Text (on white) | Contrast Ratio |
|---|---|---|---|---|
| **Success** | `#F6FFED` | `#B7EB8F` | `#389E0D` | 5.14:1 ✅ |
| **Warning** | `#FFFBE6` | `#FFE58F` | `#996E00` | 4.56:1 ✅ |
| **Error** | `#FFF2F0` | `#FFCCC7` | `#CF1322` | 5.88:1 ✅ |
| **Info** | `#E6F4FF` | `#91CAFF` | `#0958D9` | 5.72:1 ✅ |

> **Note:** Plan.md Phase 0 defines Ant Design default semantic colors (`success: #52C41A`, `warning: #FAAD14`, `error: #FF4D4F`, `info: #1890FF`). The NCTS design system intentionally uses darker WCAG-compliant text variants above. The lighter Ant defaults are still used for backgrounds/borders via the Ant Design token system — only the text-on-white colors are overridden to meet AA contrast ratios.

### Neutral Grays

| Token | Hex | Usage |
|---|---|---|
| `neutral-50` | `#FAFAFA` | Page background |
| `neutral-100` | `#F5F5F5` | Card hover, footer bg |
| `neutral-200` | `#E8E8E8` | Borders, dividers |
| `neutral-300` | `#D9D9D9` | Disabled borders |
| `neutral-400` | `#BFBFBF` | Placeholder text |
| `neutral-500` | `#8C8C8C` | Secondary text |
| `neutral-600` | `#595959` | Body text |
| `neutral-700` | `#434343` | Headings |
| `neutral-800` | `#262626` | Primary text |
| `neutral-900` | `#141414` | High-emphasis text |

### Surface Colors

| Token | Hex | Usage |
|---|---|---|
| `surface-background` | `#FAFAFA` | App background (neutral-50) |
| `surface-card` | `#FFFFFF` | Card/panel backgrounds |
| `surface-elevated` | `#FFFFFF` | Modals, drawers, dropdowns |
| `surface-sidebar` | `#001529` | Ant dark sidebar (ProLayout default) |
| `surface-masthead` | `#1B3A5C` | Government masthead bar |

### Text Colors

| Token | Hex | On Surface | Contrast |
|---|---|---|---|
| `text-primary` | `#262626` | White | 14.6:1 ✅ |
| `text-secondary` | `#595959` | White | 7.46:1 ✅ |
| `text-tertiary` | `#8C8C8C` | White | 3.54:1 ✅ (large) |
| `text-disabled` | `#BFBFBF` | White | 1.97:1 ❌ (decorative only) |
| `text-inverse` | `#FFFFFF` | Primary-500 | 8.1:1 ✅ |
| `text-link` | `#0958D9` | White | 5.72:1 ✅ |
| `text-link-hover` | `#003EB3` | White | 8.82:1 ✅ |

### WCAG Color Contrast Reference Matrix

| Foreground ↓ / Background → | White `#FFF` | Neutral-50 `#FAFAFA` | Primary-500 `#1B3A5C` | Secondary-500 `#007A4D` |
|---|---|---|---|---|
| `text-primary` (#262626) | 14.6:1 ✅ | 14.0:1 ✅ | — | — |
| `text-secondary` (#595959) | 7.46:1 ✅ | 7.17:1 ✅ | — | — |
| `text-inverse` (#FFFFFF) | — | — | 8.1:1 ✅ | 5.9:1 ✅ |
| `success-text` (#389E0D) | 5.14:1 ✅ | 4.94:1 ✅ | — | — |
| `warning-text` (#996E00) | 4.56:1 ✅ | 4.38:1 ✅ | — | — |
| `error-text` (#CF1322) | 5.88:1 ✅ | 5.65:1 ✅ | — | — |
| `info-text` (#0958D9) | 5.72:1 ✅ | 5.50:1 ✅ | — | — |
| `accent-500` (#FFB81C) | 1.94:1 ❌ | 1.86:1 ❌ | 4.19:1 ✅(lg) | 3.05:1 ✅(lg) |
| `accent-700` (#996E00) | 4.56:1 ✅ | 4.38:1 ✅ | — | — |

## 0.2 Typography

Font stack: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`
Monospace: `'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace`

| Token | Size | Weight | Line Height | Letter Spacing | Font | Usage |
|---|---|---|---|---|---|---|
| `heading-1` | 32px | 700 | 40px (1.25) | -0.02em | Inter | Page titles |
| `heading-2` | 24px | 600 | 32px (1.33) | -0.01em | Inter | Section headings |
| `heading-3` | 20px | 600 | 28px (1.4) | 0 | Inter | Card titles, subsections |
| `heading-4` | 16px | 600 | 24px (1.5) | 0 | Inter | Widget titles |
| `heading-5` | 14px | 600 | 22px (1.57) | 0.01em | Inter | Small headings, labels |
| `body-lg` | 16px | 400 | 24px (1.5) | 0 | Inter | Prominent body text |
| `body` | 14px | 400 | 22px (1.57) | 0 | Inter | Default body text |
| `body-sm` | 12px | 400 | 20px (1.67) | 0.01em | Inter | Supplementary text |
| `caption` | 12px | 500 | 16px (1.33) | 0.02em | Inter | Timestamps, metadata |
| `overline` | 11px | 600 | 16px (1.45) | 0.08em | Inter | Section labels (uppercase) |
| `mono-lg` | 16px | 500 | 24px (1.5) | 0.02em | JetBrains Mono | Tracking IDs, main display |
| `mono` | 14px | 400 | 22px (1.57) | 0.02em | JetBrains Mono | Inline codes, IDs |
| `mono-sm` | 12px | 400 | 18px (1.5) | 0.02em | JetBrains Mono | Table tracking IDs |

### Font Loading Strategy

```html
<!-- Preload critical fonts to avoid FOUT -->
<link rel="preload" href="/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/jetbrains-mono-var-latin.woff2" as="font" type="font/woff2" crossorigin>
```

Use `font-display: swap` for Inter (body text shown immediately), `font-display: optional` for JetBrains Mono (acceptable fallback to system mono).

## 0.3 Spacing

Based on 4px base unit, 8px grid.

| Token | Value | Usage |
|---|---|---|
| `space-0` | 0px | — |
| `space-1` | 4px | Tight gaps: icon-to-label, badge inner padding |
| `space-2` | 8px | Standard inner padding, grid gutter minimum |
| `space-3` | 12px | Card inner padding compact |
| `space-4` | 16px | Default card padding, form field gap |
| `space-5` | 20px | Section gaps |
| `space-6` | 24px | Card content padding, standard gutter |
| `space-8` | 32px | Large section spacing |
| `space-10` | 40px | Page sections, masthead height |
| `space-12` | 48px | Large gutters |
| `space-16` | 64px | Page top/bottom padding |

## 0.4 Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 4px | Badges, compact buttons |
| `radius-md` | 6px | Default button, input |
| `radius-lg` | 8px | Cards, panels |
| `radius-xl` | 12px | Modals, large containers |
| `radius-2xl` | 16px | Hero sections, large feature areas |
| `radius-full` | 9999px | Avatars, pills, circular badges |

## 0.5 Elevation / Shadows

| Token | Value | Usage |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift: hover cards |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Cards at rest |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` | Dropdowns, popovers |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Modals, drawers |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` | Floating action buttons |

## 0.6 Motion Tokens

| Token | Value | Usage |
|---|---|---|
| `duration-fast` | 150ms | Hover states, color transitions |
| `duration-normal` | 250ms | Expand/collapse, slide-in |
| `duration-slow` | 400ms | Page transitions, skeleton fade |
| `easing-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard easing |
| `easing-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering |
| `easing-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 0.7 Breakpoints

| Token | Min Width | Target Devices |
|---|---|---|
| `xs` | 0px | Small phones (Galaxy A03) |
| `sm` | 576px | Large phones (Galaxy A15) |
| `md` | 768px | Tablets (iPad Mini), landscape phones |
| `lg` | 992px | Small laptops, iPad landscape |
| `xl` | 1200px | Standard desktops |
| `xxl` | 1600px | Large monitors, government workstations |

### Responsive Design Strategy
- **Mobile-first** CSS with `min-width` breakpoints
- **xs–sm**: Single column, bottom tab navigation, card-based layouts
- **md**: Two columns where appropriate, sidebar collapses to icons
- **lg+**: Full sidebar, multi-column dashboards, full data tables

## 0.8 Z-Index Scale

| Token | Value | Usage |
|---|---|---|
| `z-dropdown` | 1000 | Select dropdowns, autocomplete |
| `z-sticky` | 1020 | Sticky table headers |
| `z-fixed` | 1030 | Fixed bottom nav (mobile) |
| `z-modal-backdrop` | 1040 | Modal overlay |
| `z-modal` | 1050 | Modal content |
| `z-popover` | 1060 | Popovers, tooltips |
| `z-tooltip` | 1070 | Tooltip layer |
| `z-masthead` | 1080 | Government masthead (always on top) |

## 0.9 Icon System

### Standard Icons — Lucide React

Use `lucide-react` for all standard UI icons. Size tokens: `sm` (16px), `md` (20px), `lg` (24px), `xl` (32px).

| Icon | Lucide Name | Usage Context |
|---|---|---|
| Dashboard | `LayoutDashboard` | Sidebar nav |
| Plants | `Sprout` | Plant management |
| Facilities | `Building2` | Facility pages |
| Harvests | `Wheat` | Harvest management |
| Lab Results | `FlaskConical` | Lab results |
| Transfers | `Truck` | Transfer tracking |
| Sales | `ShoppingCart` | Sales records |
| Compliance | `ShieldCheck` | Compliance scoring |
| Permits | `FileCheck` | Permit management |
| Operators | `Users` | Operator listing |
| Settings | `Settings` | System settings |
| Notifications | `Bell` | Alert system |
| Search | `Search` | Global search |
| Filter | `Filter` | Table filtering |
| Export | `Download` | CSV/PDF export |
| Print | `Printer` | Print functionality |
| Refresh | `RefreshCw` | Data refresh |
| Add | `Plus` | Create new entity |
| Edit | `Pencil` | Edit action |
| Delete | `Trash2` | Delete action |
| View | `Eye` | View detail |
| Copy | `Copy` | Copy to clipboard |
| Check | `Check` | Confirmation |
| Close | `X` | Close/dismiss |
| Warning | `AlertTriangle` | Warning states |
| Error | `AlertCircle` | Error states |
| Info | `Info` | Information |
| Offline | `WifiOff` | Offline indicator |
| Upload | `Upload` | File upload |
| QR Code | `QrCode` | QR code scanning |
| Map | `MapPin` | Location/map |
| Calendar | `Calendar` | Date selection |
| Clock | `Clock` | Time/timestamps |
| User | `User` | User profile |
| Logout | `LogOut` | Sign out |
| Charts | `BarChart3` | Reports & analytics |
| Compliance Alert | `ShieldAlert` | Compliance violations |
| Documents | `FileText` | Reports, documents, audit trail |
| Mail | `Mail` | Email-related UI (login, notifications) |
| Key | `KeyRound` | Password, API keys |
| Signature | `PenTool` | Digital signature |

### Custom SVG Icons — `packages/ui/src/icons/`

These domain-specific icons are custom SVGs built to match Lucide's 24×24 grid, 2px stroke, rounded caps:

| Icon | Filename | Description |
|---|---|---|
| Cannabis Leaf | `cannabis-leaf.svg` | Stylized 5-point leaf, used in logo and plant type indicators |
| Plant Seedling | `plant-seedling.svg` | Small sprouting plant, seedling lifecycle stage |
| Plant Vegetative | `plant-vegetative.svg` | Medium plant with leaves, vegetative stage |
| Plant Flowering | `plant-flowering.svg` | Plant with buds, flowering stage |
| Harvest Bundle | `harvest-bundle.svg` | Tied plant material bundle |
| Lab Flask | `lab-flask.svg` | Erlenmeyer flask with liquid level indicator |
| Transfer Truck | `transfer-truck.svg` | Cargo truck with cannabis leaf on side |
| QR Tag | `qr-tag.svg` | Luggage-tag-style QR code label |
| Facility Farm | `facility-farm.svg` | Greenhouse outline with cannabis leaf |
| Facility Processor | `facility-processor.svg` | Factory building with gear |
| SA Coat of Arms | `sa-coat-of-arms.svg` | Official RSA coat of arms (24px optimized) |
| NCTS Shield | `ncts-shield.svg` | Shield with cannabis leaf + tracking lines |

Each custom icon exports as a React component:

```tsx
// packages/ui/src/icons/CannabisLeaf.tsx
import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 16, md: 20, lg: 24, xl: 32 };

export function CannabisLeaf({ size = 'md', ...props }: IconProps) {
  const px = sizes[size];
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none" 
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" 
         strokeLinejoin="round" {...props}>
      {/* SVG path data */}
    </svg>
  );
}
```

## 0.10 Ant Design 5 Theme Configuration

```typescript
// packages/ui/src/theme/nctsTheme.ts
import type { ThemeConfig } from 'antd';

export const nctsTheme: ThemeConfig = {
  token: {
    // Colors
    colorPrimary: '#1B3A5C',
    colorSuccess: '#389E0D',
    colorWarning: '#996E00',
    colorError: '#CF1322',
    colorInfo: '#0958D9',
    colorLink: '#0958D9',
    colorTextBase: '#262626',
    colorBgBase: '#FFFFFF',
    colorBgLayout: '#FAFAFA',
    
    // Typography
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontFamilyCode: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    lineHeight: 1.57,
    lineHeightHeading1: 1.25,
    lineHeightHeading2: 1.33,
    lineHeightHeading3: 1.4,
    lineHeightHeading4: 1.5,
    lineHeightHeading5: 1.57,
    
    // Spacing & Size
    borderRadius: 6,
    borderRadiusSM: 4,
    borderRadiusLG: 8,
    borderRadiusXS: 2,
    controlHeight: 36,
    controlHeightSM: 28,
    controlHeightLG: 44,
    padding: 16,
    paddingSM: 12,
    paddingLG: 24,
    paddingXS: 8,
    margin: 16,
    marginSM: 12,
    marginLG: 24,
    marginXS: 8,
    
    // Shadows
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    boxShadowSecondary: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
    
    // Motion
    motionDurationFast: '0.15s',
    motionDurationMid: '0.25s',
    motionDurationSlow: '0.4s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightSM: 28,
      controlHeightLG: 44,
      fontWeight: 500,
    },
    Table: {
      borderRadius: 8,
      headerBg: '#FAFAFA',
      headerColor: '#262626',
      headerSortActiveBg: '#F0F0F0',
      rowHoverBg: '#E8EDF3',
      headerSplitColor: '#E8E8E8',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Card: {
      borderRadiusLG: 8,
      paddingLG: 24,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 6,
      controlHeight: 36,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemSelectedBg: '#1B3A5C',
    },
    Layout: {
      siderBg: '#001529',
      headerBg: '#FFFFFF',
      bodyBg: '#FAFAFA',
    },
    Tabs: {
      inkBarColor: '#1B3A5C',
      itemSelectedColor: '#1B3A5C',
      itemHoverColor: '#5C7DA5',
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Badge: {
      dotSize: 8,
    },
    Steps: {
      colorPrimary: '#007A4D',
    },
    Form: {
      labelColor: '#434343',
      labelFontSize: 14,
    },
    Notification: {
      borderRadiusLG: 8,
    },
    Message: {
      borderRadiusLG: 8,
    },
  },
};
```

---

# Section 1: Layout & Navigation System

## 1.1 Government Masthead Bar

The masthead is the topmost element on every page across all three apps. It identifies NCTS as an official Republic of South Africa system.

### Specification

| Property | Value |
|---|---|
| Height | 40px |
| Background | `primary-500` (#1B3A5C) |
| Text color | White (#FFFFFF) |
| Font | `body-sm` (12px/500) |
| Z-index | `z-masthead` (1080) |
| Position | Fixed top |
| Width | 100vw |

### Desktop Layout (≥768px)
```
┌──────────────────────────────────────────────────────┐
│ 🇿🇦 Republic of South Africa │ Official Cannabis Tracking System │
└──────────────────────────────────────────────────────┘
```
- Left: SA coat of arms SVG (20px) + `space-2` gap + "Republic of South Africa" in `body-sm`
- Right: "Official Cannabis Tracking System" in `body-sm` (font-weight 500)
- Horizontal padding: `space-6` (24px)

### Mobile Layout (<768px)
```
┌──────────────────────────────────────────┐
│ 🇿🇦 RSA  │  Official System             │
└──────────────────────────────────────────┘
```
- Left: SA coat of arms SVG (16px) + "RSA"
- Right: "Official System" (abbreviated)
- Height: 32px on mobile
- Font: `caption` (12px)

### Accessibility
- `role="banner"` on masthead element
- `aria-label="South African government official system identifier"`
- Skip link: First focusable element is "Skip to main content" link (`sr-only` until focused)

## 1.2 Phase Banner

Displayed below the masthead to indicate system maturity.

### Specification

| Property | Value |
|---|---|
| Background | `info-bg` (#E6F4FF) |
| Border-bottom | 1px solid `info-border` (#91CAFF) |
| Text color | `text-primary` (#262626) |
| Padding | `space-2` (8px) vertical, `space-6` (24px) horizontal |
| Tag color | `info-text` (#0958D9) on `info-bg` |

### Layout
```
┌──────────────────────────────────────────────────────────────┐
│ [PILOT] This system is in pilot phase. Your feedback helps   │
│         improve it. [Give feedback →]              [✕ Dismiss]│
└──────────────────────────────────────────────────────────────┘
```

- "PILOT" in an `<Tag color="blue">` component
- Feedback link opens a modal or mailto link
- Dismiss button: stores `ncts-phase-banner-dismissed` in `localStorage` (per session: cleared on app version change)
- On mobile: text wraps, dismiss is icon-only (`X`)

### Phase Transitions
| Phase | Tag | Color | Text |
|---|---|---|---|
| Pilot | `PILOT` | Blue | "This system is in pilot phase. Your feedback helps improve it." |
| Beta | `BETA` | Orange | "This system is in beta. Some features may change." |
| Live | — | — | Banner removed entirely |

## 1.3 ProLayout Configuration — Operator Portal (`apps/web/`)

Migrate from current `Ant Layout` + custom `AppSider`/`AppHeader` to `@ant-design/pro-components` `ProLayout`.

### ProLayout Props

```tsx
// apps/web/src/layouts/OperatorLayout.tsx
import ProLayout from '@ant-design/pro-layout';
import { CannabisLeaf } from '@ncts/ui/icons';

const operatorLayoutProps = {
  title: 'NCTS',
  logo: <CannabisLeaf size="lg" />,
  layout: 'mix' as const,     // top header + side menu
  navTheme: 'light' as const,
  fixSiderbar: true,
  fixedHeader: true,
  headerHeight: 56,            // below masthead (40px) + phase banner (~40px)
  siderWidth: 240,
  collapsedButtonRender: false, // custom collapse trigger
  
  // Breakpoints
  breakpoint: 'lg' as const,   // auto-collapse below lg (992px)
  
  // Menu
  menuProps: {
    collapsedWidth: 64,
  },
  
  // Content
  contentWidth: 'Fluid' as const,
  
  // Token overrides
  token: {
    header: {
      colorBgHeader: '#FFFFFF',
      heightLayoutHeader: 56,
    },
    sider: {
      colorMenuBackground: '#001529',
      colorTextMenu: 'rgba(255,255,255,0.65)',
      colorTextMenuSelected: '#FFFFFF',
      colorBgMenuItemSelected: '#1B3A5C',
      colorTextMenuActive: '#FFFFFF',
    },
    pageContainer: {
      paddingBlockPageContainerContent: 24,
      paddingInlinePageContainerContent: 24,
    },
  },
};
```

### Operator Menu Structure

```tsx
const operatorMenuRoutes = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    path: '/plants',
    name: 'Plant Management',
    icon: <Sprout size={20} />,
    children: [
      { path: '/plants', name: 'All Plants' },
      { path: '/plants/register', name: 'Register Plant' },
      { path: '/plants/batches', name: 'Batches' },
    ],
  },
  {
    path: '/facilities',
    name: 'Facilities',
    icon: <Building2 size={20} />,
  },
  {
    path: '/harvests',
    name: 'Harvests',
    icon: <Wheat size={20} />,
  },
  {
    path: '/lab-results',
    name: 'Lab Results',
    icon: <FlaskConical size={20} />,
  },
  {
    path: '/transfers',
    name: 'Transfers',
    icon: <Truck size={20} />,
    children: [
      { path: '/transfers', name: 'All Transfers' },
      { path: '/transfers/outgoing', name: 'Outgoing' },
      { path: '/transfers/incoming', name: 'Incoming' },
    ],
  },
  {
    path: '/sales',
    name: 'Sales',
    icon: <ShoppingCart size={20} />,
  },
];
```

### Operator Header Content

```tsx
const OperatorHeader = () => (
  <Row align="middle" justify="space-between" style={{ width: '100%' }}>
    {/* Left: Breadcrumbs */}
    <AppBreadcrumbs />
    
    {/* Right: Actions */}
    <Space size={16}>
      <DataFreshness />
      <SyncStatus />
      <SearchGlobal />
      <Tooltip title="Notifications">
        <Badge count={notifications.length} size="small">
          <Button type="text" icon={<Bell size={20} />} />
        </Badge>
      </Tooltip>
      <Dropdown menu={{ items: userMenuItems }}>
        <Space>
          <Avatar style={{ backgroundColor: '#1B3A5C' }}>
            {user?.name?.charAt(0)}
          </Avatar>
          <span className="hidden-mobile">{user?.name}</span>
        </Space>
      </Dropdown>
    </Space>
  </Row>
);
```

### User Dropdown Menu Items

| Item | Icon | Action |
|---|---|---|
| My Profile | `User` | Navigate to `/profile` |
| Operator Settings | `Settings` | Navigate to `/settings` |
| Notification Preferences | `Bell` | Navigate to `/settings/notifications` |
| Help & Support | `HelpCircle` | Open help panel |
| Sign Out | `LogOut` | Logout + redirect to login |

## 1.4 ProLayout Configuration — Government Dashboard (`apps/admin/`)

### ProLayout Props

```tsx
// apps/admin/src/layouts/AdminLayout.tsx
const adminLayoutProps = {
  title: 'NCTS Admin',
  logo: <NctsShield size="lg" />,
  layout: 'mix' as const,
  navTheme: 'light' as const,
  fixSiderbar: true,
  fixedHeader: true,
  headerHeight: 56,
  siderWidth: 260,
  
  token: {
    header: {
      colorBgHeader: '#FFFFFF',
      heightLayoutHeader: 56,
    },
    sider: {
      colorMenuBackground: '#001529',
      colorTextMenu: 'rgba(255,255,255,0.65)',
      colorTextMenuSelected: '#FFFFFF',
      colorBgMenuItemSelected: '#1B3A5C',
    },
  },
};
```

### Admin Menu Structure

```tsx
const adminMenuRoutes = [
  {
    path: '/dashboard',
    name: 'National Overview',
    icon: <LayoutDashboard size={20} />,
  },
  {
    path: '/operators',
    name: 'Operators',
    icon: <Users size={20} />,
    children: [
      { path: '/operators', name: 'All Operators' },
      { path: '/operators/applications', name: 'Applications' },
    ],
  },
  {
    path: '/permits',
    name: 'Permits & Licenses',
    icon: <FileCheck size={20} />,
    children: [
      { path: '/permits', name: 'All Permits' },
      { path: '/permits/pending', name: 'Pending Review' },
      { path: '/permits/expired', name: 'Expired' },
    ],
  },
  {
    path: '/compliance',
    name: 'Compliance',
    icon: <ShieldCheck size={20} />,
    children: [
      { path: '/compliance', name: 'Overview' },
      { path: '/compliance/alerts', name: 'Active Alerts' },
      { path: '/compliance/inspections', name: 'Inspections' },
    ],
  },
  {
    path: '/facilities',
    name: 'Facilities',
    icon: <Building2 size={20} />,
    children: [
      { path: '/facilities', name: 'All Facilities' },
      { path: '/facilities/map', name: 'Map View' },
    ],
  },
  {
    path: '/tracking',
    name: 'Supply Chain',
    icon: <Truck size={20} />,
    children: [
      { path: '/tracking/plants', name: 'Plant Registry' },
      { path: '/tracking/transfers', name: 'Transfers' },
      { path: '/tracking/sales', name: 'Sales' },
    ],
  },
  {
    path: '/reports',
    name: 'Reports',
    icon: <BarChart3 size={20} />,
    children: [
      { path: '/reports/monthly', name: 'Monthly Reports' },
      { path: '/reports/incb', name: 'INCB Export' },
      { path: '/reports/custom', name: 'Custom Builder' },
    ],
  },
  {
    path: '/audit',
    name: 'Audit Log',
    icon: <FileText size={20} />,
  },
  {
    path: '/settings',
    name: 'System Settings',
    icon: <Settings size={20} />,
    children: [
      { path: '/settings/general', name: 'General' },
      { path: '/settings/thresholds', name: 'Compliance Thresholds' },
      { path: '/settings/users', name: 'Admin Users' },
    ],
  },
];
```

### Admin Header Content

```tsx
const AdminHeader = () => (
  <Row align="middle" justify="space-between" style={{ width: '100%' }}>
    <AppBreadcrumbs />
    <Space size={16}>
      <DataFreshness />
      <SearchGlobal />
      <Tooltip title="Compliance Alerts">
        <Badge count={activeAlerts} size="small" color="#CF1322">
          <Button type="text" icon={<ShieldAlert size={20} />} />
        </Badge>
      </Tooltip>
      <Dropdown menu={{ items: adminUserMenuItems }}>
        <Space>
          <Avatar style={{ backgroundColor: '#007A4D' }}>
            {admin?.name?.charAt(0)}
          </Avatar>
          <span className="hidden-mobile">{admin?.name}</span>
          <Tag color="green">Admin</Tag>
        </Space>
      </Dropdown>
    </Space>
  </Row>
);
```

## 1.5 Mobile Navigation

On viewports below `md` (768px), the sidebar is completely hidden and replaced by a bottom tab bar.

### Bottom Tab Bar Specification

| Property | Value |
|---|---|
| Height | 56px + safe-area-inset-bottom |
| Background | White (#FFFFFF) |
| Border-top | 1px solid `neutral-200` (#E8E8E8) |
| Shadow | `shadow-md` (upward) |
| Position | Fixed bottom |
| Z-index | `z-fixed` (1030) |
| Padding-bottom | env(safe-area-inset-bottom) |

### Operator Portal Tabs (Mobile)

| Tab | Icon | Label | Route |
|---|---|---|---|
| Home | `LayoutDashboard` | Dashboard | `/dashboard` |
| Plants | `Sprout` | Plants | `/plants` |
| Transfers | `Truck` | Transfers | `/transfers` |
| Sales | `ShoppingCart` | Sales | `/sales` |
| More | `Menu` | More | Opens drawer with remaining items |

### Government Dashboard Tabs (Mobile)

| Tab | Icon | Label | Route |
|---|---|---|---|
| Overview | `LayoutDashboard` | Overview | `/dashboard` |
| Compliance | `ShieldCheck` | Compliance | `/compliance` |
| Permits | `FileCheck` | Permits | `/permits` |
| Facilities | `Building2` | Facilities | `/facilities` |
| More | `Menu` | More | Opens drawer with remaining items |

### Tab Active State
- Icon: filled variant or `primary-500` color
- Label: `primary-500` color, `caption` bold (12px/600)
- Inactive: `neutral-500` (#8C8C8C)
- Transition: `duration-fast` (150ms)

### "More" Drawer
- Slides up from bottom (50% height max)
- Shows remaining menu items in a list
- Each with icon + label + optional badge
- Backdrop: semi-transparent black (rgba(0,0,0,0.3))
- Swipe-down to dismiss, tap backdrop to dismiss

## 1.6 Page Container Pattern

Every page wraps content in a `PageContainer` from ProComponents.

```tsx
import { PageContainer } from '@ant-design/pro-components';

const ExamplePage = () => (
  <PageContainer
    title="Plant Management"
    subTitle="View and manage all registered plants"
    breadcrumb={{}} // auto-generated from route config
    extra={[
      <CsvExportButton key="export" data={plants} filename="plants" />,
      <PrintButton key="print" />,
      <Button key="add" type="primary" icon={<Plus size={16} />}>
        Register Plant
      </Button>,
    ]}
    tabList={[
      { key: 'active', tab: 'Active Plants' },
      { key: 'harvested', tab: 'Harvested' },
      { key: 'destroyed', tab: 'Destroyed' },
    ]}
    onTabChange={setActiveTab}
  >
    {/* Page content */}
  </PageContainer>
);
```

### Page Container Standards

| Property | Desktop | Tablet | Mobile |
|---|---|---|---|
| Content max-width | None (fluid) | None (fluid) | None (fluid) |
| Padding horizontal | 24px | 16px | 12px |
| Padding vertical | 24px | 16px | 12px |
| Title font | `heading-2` (24px) | `heading-3` (20px) | `heading-3` (20px) |
| Extra buttons | All visible | Icon-only for secondary | Overflow menu |

## 1.7 Loading States

### SkeletonDashboard
- 4 stat cards (shimmer rectangles: 25% width each)
- Below: 2 chart placeholders (50% width each)
- Below: 1 full-width table placeholder (header + 5 rows)

### SkeletonTable
- Table header row (shimmer)
- 10 rows of alternating-width shimmer blocks
- Pagination placeholder at bottom

### SkeletonDetail
- Back button placeholder
- Title + subtitle shimmer
- Status badge placeholder
- 2-column detail grid (label-value pairs, 8 rows)
- Action bar placeholder

### SkeletonForm
- Title shimmer
- Steps indicator placeholder (4 dots)
- 3 form field placeholders (label + input)
- Button row placeholder

### Implementation

```tsx
// packages/ui/src/components/SkeletonPage.tsx
import { Skeleton, Card, Row, Col, Space } from 'antd';

type SkeletonVariant = 'dashboard' | 'table' | 'detail' | 'form';

interface SkeletonPageProps {
  variant: SkeletonVariant;
}

// Renders appropriate skeleton based on variant
// All skeletons use Ant's Skeleton with active={true} for animation
// Respects prefers-reduced-motion: stops animation pulse
```

## 1.8 Error States

### 404 — Not Found

```
┌─────────────────────────────────────────┐
│                                         │
│            [Empty state icon]           │
│                                         │
│         Page Not Found                  │
│                                         │
│  The page you're looking for doesn't    │
│  exist or has been moved.               │
│                                         │
│  [← Go to Dashboard]                   │
│                                         │
└─────────────────────────────────────────┘
```
- Use Ant `Result` component with `status="404"`
- Custom illustration (optional): Cannabis leaf with magnifying glass
- Primary CTA: Navigate to dashboard

### 500 — Server Error

```
┌─────────────────────────────────────────┐
│                                         │
│          [Warning illustration]         │
│                                         │
│        Something Went Wrong             │
│                                         │
│  We're experiencing technical           │
│  difficulties. Please try again.        │
│                                         │
│  [↻ Try Again]  [← Go to Dashboard]    │
│                                         │
│  Error reference: NCT-500-abc123        │
│                                         │
└─────────────────────────────────────────┘
```
- Show error reference code for support tickets
- "Try Again" reloads the current route
- Logged to monitoring

### Network Error (Inline)

```
┌─────────────────────────────────────────┐
│ ⚠️ Unable to load data. Check your      │
│    connection and try again. [Retry]    │
└─────────────────────────────────────────┘
```
- Inline `Alert` component (`type="warning"`)
- Shown within the page content area, not full page
- Retry button calls the failed query's `refetch()`

### Permission Denied — 403

- `Result` with `status="403"`
- "You don't have permission to access this page."
- "Contact your administrator if you believe this is an error."
- CTA: "← Go to Dashboard"

### Session Expired

- Modal (non-dismissible) with countdown: "Your session has expired. Redirecting to login in 5s..."
- Auto-redirect to `/login` after 5 seconds
- "Sign in now" button for immediate redirect

## 1.9 Empty States

Each entity has a contextual empty state with unique messaging:

| Entity | Icon | Heading | Description | CTA |
|---|---|---|---|---|
| Plants | `Sprout` | No plants registered | Register your first plant to begin tracking its lifecycle. | Register Plant |
| Facilities | `Building2` | No facilities yet | Add your cultivation or processing facility to get started. | Add Facility |
| Harvests | `Wheat` | No harvests recorded | Harvests will appear here once plants are harvested. | Record Harvest |
| Lab Results | `FlaskConical` | No lab results | Submit samples to an approved laboratory for testing. | — (no CTA) |
| Transfers | `Truck` | No transfers | Transfer cannabis between facilities or to buyers. | Create Transfer |
| Sales | `ShoppingCart` | No sales recorded | Sales records will appear after completed transfers. | Record Sale |
| Permits | `FileCheck` | No permits found | Apply for cannabis operator permits through SAHPRA. | Apply for Permit |
| Compliance Alerts | `ShieldCheck` | All clear! ✅ | No active compliance alerts. Keep up the good work. | — (positive state) |
| Operators (admin) | `Users` | No operators registered | Operators will appear once they register in the system. | — (no CTA) |

### Implementation Pattern

```tsx
<EntityEmptyState
  icon={<Sprout size={48} strokeWidth={1.5} />}
  heading="No plants registered"
  description="Register your first plant to begin tracking its lifecycle."
  action={
    <Button type="primary" icon={<Plus size={16} />}>
      Register Plant
    </Button>
  }
/>
```

## 1.10 Toast & Notification System

### Transient Feedback — `message` API

For immediate action confirmations:

| Action | Type | Message |
|---|---|---|
| Entity created | `success` | "Plant PLT-20250106-AAA registered successfully" |
| Entity updated | `success` | "Facility details updated" |
| Entity deleted | `success` | "Draft transfer deleted" |
| Export started | `info` | "Exporting 250 records to CSV..." |
| Export complete | `success` | "Export complete — download started" |
| Copy to clipboard | `success` | "Tracking ID copied" |
| Form validation error | `error` | "Please fix the highlighted fields" |
| Network error | `error` | "Unable to save — check your connection" |
| Permission denied | `warning` | "You don't have permission for this action" |

Configuration:
```tsx
message.config({
  top: 100,        // below masthead + header
  duration: 4,     // seconds
  maxCount: 3,     // stack limit
  prefixCls: 'ncts-message',
});
```

### Persistent Notifications — `notification` API

For events requiring attention:

| Event | Type | Title | Description | Duration |
|---|---|---|---|---|
| Transfer received | `info` | "Incoming Transfer" | "{operator} sent {qty} plants. Review required." | 0 (manual dismiss) |
| Permit expiring | `warning` | "Permit Expiring" | "Permit {number} expires in {days} days." | 0 |
| Compliance alert | `error` | "Compliance Alert" | "{description}. Immediate action required." | 0 |
| System maintenance | `info` | "Scheduled Maintenance" | "System maintenance at {time}." | 30s |

Configuration:
```tsx
notification.config({
  placement: 'topRight',
  top: 100,         
  duration: 0,       // persistent by default
  maxCount: 5,
  stack: { threshold: 3 }, // stack after 3
});
```

## 1.11 Government Footer

Present on all three apps. Provides legal compliance links and official identification.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  [SA Coat of Arms]                                         │
│  National Cannabis                                         │
│  Tracking System                                          │
│                                                            │
│  About              Legal               Contact            │
│  ─────              ─────               ───────            │
│  About NCTS         POPIA Notice        Technical Support  │
│  How It Works       PAIA Manual         ncts@health.gov.za │
│  For Operators      Terms of Use        0800-NCTS (6287)   │
│  For Regulators     Accessibility       Report an Issue    │
│                     Cookie Policy                          │
│                                                            │
│  ────────────────────────────────────────────────────────  │
│  © 2025 Republic of South Africa.     [Language: English ▾]│
│  Department of Health.                                     │
│  All rights reserved.                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Specification

| Property | Value |
|---|---|
| Background | `neutral-100` (#F5F5F5) |
| Border-top | 1px solid `neutral-200` (#E8E8E8) |
| Padding | `space-16` (64px) top, `space-8` (32px) bottom |
| Text color | `text-secondary` (#595959) |
| Link color | `text-link` (#0958D9) |
| Max content width | 1200px, centered |
| Copyright font | `caption` (12px) |

### Responsive Behavior

| Breakpoint | Columns |
|---|---|
| `lg`+ | 4 columns (logo + 3 link groups) |
| `md` | 2 columns (logo full-width, then 2 link groups) |
| `sm` and below | 1 column (stacked, accordion-style link groups) |

### Accessibility
- `<footer role="contentinfo">`
- All links have descriptive text (no "click here")
- Language selector: `<select>` with `aria-label="Select language"`

---

# Section 2: Shared Components (`packages/ui/`)

All shared components live in `packages/ui/src/components/`. Each component is exported from `packages/ui/src/index.ts` via barrel export.

## 2.1 GovMasthead

**File:** `packages/ui/src/components/GovMasthead.tsx`

### Props Interface

```tsx
interface GovMastheadProps {
  /** Government body name. Default: "Republic of South Africa" */
  governmentName?: string;
  /** System name. Default: "Official Cannabis Tracking System" */
  systemName?: string;
  /** Custom coat of arms SVG component */
  coatOfArms?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}
```

### Visual Description
- Thin fixed bar at absolute top of viewport
- Dark blue background (`primary-500`), white text
- Left-aligned: coat of arms icon + government name
- Right-aligned: system identifier
- Always visible, never scrolls away

### Responsive Behavior
| Breakpoint | Government Name | System Name | Height |
|---|---|---|---|
| `md+` | "Republic of South Africa" | "Official Cannabis Tracking System" | 40px |
| `sm` | "RSA" | "Official System" | 32px |
| `xs` | "RSA" | Hidden | 32px |

### Accessibility
- `role="banner"`
- `aria-label="South African government official system identifier"`
- Contains skip-nav link as first child: `<a href="#main-content" className="sr-only focus:not-sr-only">`

### Usage

```tsx
<GovMasthead />

// Custom for a different department
<GovMasthead
  governmentName="Department of Health"
  systemName="Cannabis Tracking Portal"
/>
```

## 2.2 GovFooter

**File:** `packages/ui/src/components/GovFooter.tsx`

### Props Interface

```tsx
interface FooterLink {
  label: string;
  href: string;
  external?: boolean; // opens in new tab with rel="noopener"
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface GovFooterProps {
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
```

### Visual Description
- Light gray background (#F5F5F5) with top border
- SA coat of arms + NCTS branding in first column
- 3 link group columns: About, Legal, Contact
- Bottom bar: copyright text + language selector

### Responsive Behavior
| Breakpoint | Layout |
|---|---|
| `lg+` | 4 columns side-by-side |
| `md` | Logo full-width, then 2×2 grid |
| `sm-` | Single column, sections as accordions (collapsed by default) |

### Accessibility
- `<footer role="contentinfo">`
- External links: `target="_blank" rel="noopener noreferrer"` + visually hidden " (opens in new tab)" text
- Accordion sections: `aria-expanded`, `aria-controls`

## 2.3 PhaseBanner

**File:** `packages/ui/src/components/PhaseBanner.tsx`

### Props Interface

```tsx
type Phase = 'pilot' | 'beta';

interface PhaseBannerProps {
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
```

### Visual Description
- Full-width blue info bar below masthead
- Left: colored tag ("PILOT"/"BETA") + descriptive text
- Right: feedback link + dismiss button
- Dismisses to localStorage, reappears on version change

### Variants

| Phase | Tag Color | Background | Border |
|---|---|---|---|
| `pilot` | Blue (#0958D9) | #E6F4FF | #91CAFF |
| `beta` | Orange (#D46B08) | #FFF7E6 | #FFD591 |

### Accessibility
- `role="status"` 
- Dismiss button: `aria-label="Dismiss phase banner"`
- Feedback link is a standard `<a>` tag

## 2.4 StatusBadge (Enhanced)

**File:** `packages/ui/src/components/StatusBadge.tsx`

Extends the current `StatusBadge` component with dot and outline variants and full coverage of all domain enums.

### Props Interface

```tsx
type PlantStatus = 'seedling' | 'vegetative' | 'flowering' | 'harvested' | 'destroyed' | 'quarantined';
type TransferStatus = 'draft' | 'initiated' | 'dispatched' | 'in_transit' | 'received' | 'verified' | 'rejected' | 'cancelled';
type PermitStatus = 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
type ComplianceLevel = 'compliant' | 'minor_issues' | 'major_issues' | 'critical' | 'suspended';
type LabResultStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'inconclusive';
type FacilityStatus = 'active' | 'inactive' | 'suspended' | 'pending_approval';

type StatusType = PlantStatus | TransferStatus | PermitStatus | ComplianceLevel | LabResultStatus | FacilityStatus;

type BadgeVariant = 'filled' | 'outlined' | 'dot';
type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: StatusType;
  variant?: BadgeVariant;   // default: 'filled'
  size?: BadgeSize;         // default: 'md'
  showIcon?: boolean;       // default: false
  className?: string;
}
```

### Color Mapping

| Status | Color | Background (filled) | Icon |
|---|---|---|---|
| `seedling` | #389E0D | #F6FFED | Sprout |
| `vegetative` | #007A4D | #E6F5EF | Leaf |
| `flowering` | #D48806 | #FFFBE6 | Flower |
| `harvested` | #0958D9 | #E6F4FF | Check |
| `destroyed` | #8C8C8C | #F5F5F5 | Trash2 |
| `quarantined` | #CF1322 | #FFF2F0 | AlertTriangle |
| `draft` | #8C8C8C | #F5F5F5 | FileEdit |
| `initiated` | #0958D9 | #E6F4FF | ArrowRight |
| `dispatched` | #D48806 | #FFFBE6 | Truck |
| `in_transit` | #D48806 | #FFFBE6 | Navigation |
| `received` | #389E0D | #F6FFED | PackageCheck |
| `verified` | #007A4D | #E6F5EF | ShieldCheck |
| `rejected` | #CF1322 | #FFF2F0 | XCircle |
| `cancelled` | #8C8C8C | #F5F5F5 | Ban |
| `pending` | #D48806 | #FFFBE6 | Clock |
| `active` | #007A4D | #E6F5EF | CheckCircle |
| `suspended` | #CF1322 | #FFF2F0 | Pause |
| `revoked` | #CF1322 | #FFF2F0 | ShieldOff |
| `expired` | #8C8C8C | #F5F5F5 | AlertCircle |
| `compliant` | #007A4D | #E6F5EF | ShieldCheck |
| `minor_issues` | #D48806 | #FFFBE6 | AlertTriangle |
| `major_issues` | #CF1322 | #FFF2F0 | AlertCircle |
| `critical` | #CF1322 | #FFF2F0 | XOctagon |
| `passed` | #389E0D | #F6FFED | Check |
| `failed` | #CF1322 | #FFF2F0 | X |
| `inconclusive` | #D48806 | #FFFBE6 | HelpCircle |
| `in_progress` | #0958D9 | #E6F4FF | Loader2 |
| `inactive` | #8C8C8C | #F5F5F5 | Circle |
| `pending_approval` | #D48806 | #FFFBE6 | Clock |

### Size Tokens

| Size | Font | Padding | Height | Dot diameter |
|---|---|---|---|---|
| `sm` | 11px | 4px 8px | 20px | 6px |
| `md` | 12px | 4px 10px | 24px | 8px |
| `lg` | 14px | 6px 12px | 28px | 10px |

### Variants
- **filled**: Colored background + darker text (default)
- **outlined**: White background + colored border + colored text
- **dot**: Small colored circle + text in `text-primary`

### Accessibility
- `role="status"`
- `aria-label` includes full status text: `aria-label="Plant status: vegetative"`
- Color is never the sole indicator — text label always present

## 2.5 TrackingId (Enhanced)

**File:** `packages/ui/src/components/TrackingId.tsx`

### Props Interface

```tsx
interface TrackingIdProps {
  /** The tracking ID string (e.g., "PLT-20250106-ABC") */
  id: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show copy button */
  copyable?: boolean;        // default: true
  /** Show type prefix icon */
  showTypeIcon?: boolean;    // default: false
  /** Navigate to entity detail on click */
  linkTo?: string;
  /** Truncate middle for long IDs on mobile */
  truncate?: boolean;
  /** Additional class */
  className?: string;
}
```

### Visual Description
- Monospace font (`JetBrains Mono`) in a subtle gray pill background
- Optional prefix icon based on entity type (PLT→Sprout, TRF→Truck, HRV→Wheat, SAL→ShoppingCart, FAC→Building2, LAB→FlaskConical)
- Copy button (clipboard icon) appears on hover, always visible on mobile
- Click copies to clipboard, shows `message.success("Tracking ID copied")`
- If `linkTo` provided, entire component is a clickable link

### Size Tokens

| Size | Font | Padding | Icon size |
|---|---|---|---|
| `sm` | `mono-sm` (12px) | 2px 6px | 12px |
| `md` | `mono` (14px) | 4px 8px | 14px |
| `lg` | `mono-lg` (16px) | 6px 12px | 16px |

### Responsive Behavior
- `truncate` mode: Shows first 4 + "…" + last 3 chars on `xs` breakpoint
- Full ID always shown in tooltip on hover/focus

### Accessibility
- Copy button: `aria-label="Copy tracking ID {id} to clipboard"`
- After copy: `aria-live="polite"` announcement "Copied"
- If linkable: standard `<a>` element

## 2.6 NctsLogo

**File:** `packages/ui/src/components/NctsLogo.tsx`

### Props Interface

```tsx
interface NctsLogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show text alongside icon */
  showText?: boolean;         // default: true
  /** Dark mode (white text) */
  inverted?: boolean;         // default: false
  /** Additional class */
  className?: string;
}
```

### Visual Description
Replaces the current emoji "🌿 NCTS" with a proper SVG logo:
- Icon: `NctsShield` SVG (shield with stylized cannabis leaf + tracking circuit lines)
- Text: "NCTS" in Inter 700 weight, followed by line break + "National Cannabis Tracking System" in Inter 400 weight

### Size Tokens

| Size | Icon | Title | Subtitle | Usage |
|---|---|---|---|---|
| `sm` | 24px | 14px | — (hidden) | Collapsed sidebar |
| `md` | 32px | 18px | 11px | Sidebar header |
| `lg` | 48px | 24px | 14px | Login page, footer |
| `xl` | 72px | 36px | 16px | Landing page hero |

### Accessibility
- `aria-label="NCTS - National Cannabis Tracking System"` on container
- Icon SVG has `role="img"` + `aria-hidden="true"` (decorative when text present)

## 2.7 StatCard

**File:** `packages/ui/src/components/StatCard.tsx`

### Props Interface

```tsx
type TrendDirection = 'up' | 'down' | 'flat';

interface StatCardProps {
  /** KPI label */
  label: string;
  /** Formatted value string */
  value: string;
  /** Value prefix (e.g., "R" for Rand) */
  prefix?: string;
  /** Value suffix (e.g., "kg") */
  suffix?: string;
  /** Trend direction */
  trend?: TrendDirection;
  /** Change percentage (e.g., 12.5) */
  changePercent?: number;
  /** Period label for change (e.g., "vs last month") */
  changePeriod?: string;
  /** Sparkline data (last 7 data points) */
  sparkline?: number[];
  /** Subtitle/description */
  subtitle?: string;
  /** Icon */
  icon?: React.ReactNode;
  /** Icon background color */
  iconBgColor?: string;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional class */
  className?: string;
}
```

### Visual Description

```
┌──────────────────────────────────┐
│  [Icon]                          │
│                                  │
│  ACTIVE PLANTS        ▲ 12.5%   │
│  R 1,234              vs last mo │
│                                  │
│  ▁▂▃▅▆▇█▇▅ (sparkline)         │
│                                  │
│  142 registered this week        │
└──────────────────────────────────┘
```

- Card with `shadow-sm`, `radius-lg`, white bg
- Icon in colored circle bubble (top-left)
- Label in `overline` style (uppercase, small)
- Value in `heading-1` (32px bold)
- Trend arrow + percentage (green for up/positive, red for down/negative, gray for flat)
- 7-point sparkline using CSS (simple bar chart) or lightweight SVG
- Subtitle in `caption` style

### Responsive Behavior
| Breakpoint | Layout |
|---|---|
| `lg+` | 4 cards per row |
| `md` | 2 cards per row |
| `sm-` | 1 card per row, horizontally scrollable row |

### Accessibility
- Card is `role="region"` with `aria-label="{label}: {value}"`
- Trend: `aria-label="Increased by 12.5% compared to last month"`
- If clickable: entire card is wrapped in button/link with `role="link"`

## 2.8 DataFreshness

**File:** `packages/ui/src/components/DataFreshness.tsx`

### Props Interface

```tsx
interface DataFreshnessProps {
  /** Last updated timestamp (ISO string or Date) */
  lastUpdated: string | Date;
  /** Whether data is refreshing */
  isRefreshing?: boolean;
  /** Refresh handler */
  onRefresh?: () => void;
  /** Show live "pulse" dot for real-time data */
  isLive?: boolean;
  /** Compact mode (icon + relative time only) */
  compact?: boolean;
  /** Additional class */
  className?: string;
}
```

### Visual Description
- Default: "Updated 2m ago" + refresh icon button
- Compact: Just `RefreshCw` icon + "2m"
- Live mode: Green pulsing dot + "Live"
- Refreshing state: spinning `RefreshCw` icon + "Updating..."
- Stale data (>5 min): text turns `warning-text` color

### Accessibility
- Refresh button: `aria-label="Refresh data, last updated 2 minutes ago"`
- Live dot: `aria-label="Data is updating in real-time"`
- `aria-live="polite"` region for "Updated just now" announcements after refresh

## 2.9 PlantLifecycle

**File:** `packages/ui/src/components/PlantLifecycle.tsx`

### Props Interface

```tsx
type PlantStage = 'seed' | 'seedling' | 'vegetative' | 'flowering' | 'harvested' | 'destroyed';

interface LifecycleStageInfo {
  stage: PlantStage;
  date?: string | Date;
  note?: string;
}

interface PlantLifecycleProps {
  /** Current active stage */
  currentStage: PlantStage;
  /** Stage completion data */
  stages?: LifecycleStageInfo[];
  /** Orientation */
  direction?: 'horizontal' | 'vertical';
  /** Size */
  size?: 'sm' | 'md';
  /** Show date timestamps */
  showDates?: boolean;
  /** Additional class */
  className?: string;
}
```

### Visual Description (Horizontal)

```
  🌱      🌿       🌸       🌾       📦       💀
  Seed → Seedling → Veg → Flower → Harvested → Destroyed
  ●────────●────────●────────○─ ─ ─ ─ ○─ ─ ─ ─ ○
 Jan 5   Jan 20   Feb 15  (current)
```

- Completed stages: colored circles (`secondary-500`) + solid connecting line
- Current stage: larger circle with pulse animation + bold label
- Future stages: gray circles (`neutral-300`) + dashed connecting line
- Each stage uses the corresponding custom SVG icon

### Responsive Behavior
- `horizontal` on desktop (`md+`)
- Automatically switches to `vertical` on mobile (`sm-`) for readability
- Vertical mode: left-aligned timeline with connector line

### Accessibility
- `role="group"` with `aria-label="Plant lifecycle stages"`
- Each stage: `role="listitem"` with `aria-current="step"` for current
- Completed stages: `aria-label="Seedling, completed on January 20"`

## 2.10 TransferTimeline

**File:** `packages/ui/src/components/TransferTimeline.tsx`

### Props Interface

```tsx
interface TimelineEvent {
  stage: 'initiated' | 'dispatched' | 'in_transit' | 'received' | 'verified';
  timestamp?: string | Date;
  actor?: string;          // Person name who performed action
  location?: string;       // Facility name / location
  note?: string;           // Additional notes
}

interface TransferTimelineProps {
  /** Timeline events in chronological order */
  events: TimelineEvent[];
  /** Current active stage */
  currentStage: string;
  /** Orientation */
  direction?: 'vertical' | 'horizontal';
  /** Show actor names */
  showActors?: boolean;
  /** Additional class */
  className?: string;
}
```

### Visual Description (Vertical)

```
  ● Initiated                          
  │  Jan 5, 10:30 AM                   
  │  by John Doe at Facility A         
  │                                    
  ● Dispatched                         
  │  Jan 5, 2:15 PM                    
  │  by Jane Smith                     
  │                                    
  ◉ In Transit  ← (current, pulsing)  
  │  Jan 5, 3:00 PM                    
  │  Vehicle: GP-12345                 
  │                                    
  ○ Received (pending)                 
  ╎                                    
  ○ Verified (pending)                 
```

- Uses Ant `Timeline` with custom dot rendering
- Completed: green dot, full text
- Current: large blue pulsing dot, bold text
- Pending: gray hollow dot, dashed connector, gray text

### Accessibility
- `role="feed"` with `aria-label="Transfer timeline"`
- Each event: `role="article"` with timestamp as `<time>` element
- Current: `aria-current="step"`

## 2.11 PermitCard

**File:** `packages/ui/src/components/PermitCard.tsx`

### Props Interface

```tsx
interface PermitCardProps {
  /** Permit/license number */
  permitNumber: string;
  /** Permit type */
  type: 'cultivation' | 'processing' | 'distribution' | 'retail' | 'research';
  /** Current status */
  status: PermitStatus;
  /** Operator / license holder name */
  operatorName: string;
  /** Issue date */
  issuedDate: string | Date;
  /** Expiry date */
  expiryDate: string | Date;
  /** Number of active conditions */
  conditionsCount?: number;
  /** Days until expiry (computed if not passed) */
  daysToExpiry?: number;
  /** Click handler for detail navigation */
  onClick?: () => void;
  /** Additional class */
  className?: string;
}
```

### Visual Description

```
┌──────────────────────────────────────┐
│  CULTIVATION LICENSE            ● Active │
│                                          │
│  PRM-20250106-ABC                        │
│  GreenFields Cannabis (Pty) Ltd          │
│                                          │
│  Issued: 2025-01-06                      │
│  Expires: 2026-01-06 (365 days)          │
│                                          │
│  ⚠ 3 active conditions         [View →] │
└──────────────────────────────────────────┘
```

- Card with left color accent bar (type-colored): cultivation=green, processing=blue, distribution=orange, retail=purple, research=teal
- Permit type as `overline` header
- Status badge (top-right)
- Permit number in monospace
- Expiry warning: yellow when <90 days, red when <30 days
- Hover: lift with `shadow-md`

### Accessibility
- Card is `role="article"` with `aria-label="Cultivation license {number}, status: active, expires in 365 days"`
- Expiry warning announcements at <90 and <30 days

## 2.12 ComplianceScore

**File:** `packages/ui/src/components/ComplianceScore.tsx`

### Props Interface

```tsx
interface ComplianceScoreProps {
  /** Score percentage (0-100) */
  score: number;
  /** Size of the circular progress */
  size?: 'sm' | 'md' | 'lg';
  /** Show trend vs previous period */
  previousScore?: number;
  /** Label text below score */
  label?: string;
  /** Show the traffic light color indicator */
  showTrafficLight?: boolean;
  /** Additional class */
  className?: string;
}
```

### Visual Description

```
    ╭───────╮
    │  92%  │     Traffic light colors:
    ╰───────╯     ≥95%: Green (#007A4D)
   Compliant      80-94%: Yellow/Orange (#D48806)
                  <80%: Red (#CF1322)
```

- Ant `Progress` component with `type="circle"`
- Score value centered inside ring
- Ring color based on traffic-light thresholds
- Below ring: text label ("Compliant", "Needs Attention", "Critical")
- If `previousScore` provided, show small trend arrow + delta

### Size Tokens

| Size | Diameter | Font size | Stroke width |
|---|---|---|---|
| `sm` | 60px | 16px | 4px |
| `md` | 120px | 28px | 6px |
| `lg` | 180px | 40px | 8px |

### Accessibility
- `role="meter"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`
- `aria-label="Compliance score: 92 percent, compliant"`

## 2.13 EntityEmptyState

**File:** `packages/ui/src/components/EntityEmptyState.tsx`

### Props Interface

```tsx
interface EntityEmptyStateProps {
  /** Lucide icon or custom SVG */
  icon: React.ReactNode;
  /** Heading text */
  heading: string;
  /** Description text */
  description: string;
  /** Primary action button */
  action?: React.ReactNode;
  /** Secondary action (e.g., "Learn more" link) */
  secondaryAction?: React.ReactNode;
  /** Compact mode for inline empty states (e.g., within cards) */
  compact?: boolean;
  /** Additional class */
  className?: string;
}
```

### Visual Description

```
         ┌─────────────────────────────┐
         │                             │
         │          [Icon 48px]        │
         │                             │
         │     No plants registered    │
         │                             │
         │   Register your first       │
         │   plant to begin tracking   │
         │   its lifecycle.            │
         │                             │
         │    [+ Register Plant]       │
         │                             │
         └─────────────────────────────┘
```

- Centered within parent container
- Icon: 48px, `neutral-400` color, 1.5 stroke width
- Heading: `heading-3` (20px/600)
- Description: `body` (14px, `text-secondary`)
- Max text width: 400px
- CTA button: standard `Button type="primary"`
- Compact mode: Icon 24px, heading `heading-5`, no description

### Accessibility
- Container: `role="status"`
- `aria-label="No data: {heading}"`

## 2.14 SkeletonPage

**File:** `packages/ui/src/components/SkeletonPage.tsx`

### Props Interface

```tsx
type SkeletonVariant = 'dashboard' | 'table' | 'detail' | 'form';

interface SkeletonPageProps {
  /** Page type to render appropriate skeleton */
  variant: SkeletonVariant;
  /** Number of table rows (for 'table' variant) */
  rows?: number;         // default: 10
  /** Number of stat cards (for 'dashboard' variant) */
  cards?: number;        // default: 4
  /** Additional class */
  className?: string;
}
```

### Variant Layouts

**Dashboard:**
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   ← 4 stat card skeletons
│░░░░░░│ │░░░░░░│ │░░░░░░│ │░░░░░░│
└──────┘ └──────┘ └──────┘ └──────┘
┌───────────────┐ ┌───────────────┐    ← 2 chart placeholders
│░░░░░░░░░░░░░░░│ │░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░│ │░░░░░░░░░░░░░░░│
└───────────────┘ └───────────────┘
┌─────────────────────────────────┐    ← table placeholder
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────┘
```

**Table:**
```
┌────┬─────────┬────────┬──────┬──────┐
│░░░░│░░░░░░░░░│░░░░░░░░│░░░░░░│░░░░░░│  header
├────┼─────────┼────────┼──────┼──────┤
│░░░░│░░░░░░░  │░░░░░░  │░░░░  │░░░░  │  rows × 10
│░░░░│░░░░░    │░░░░░░░ │░░░   │░░░░░ │
└────┴─────────┴────────┴──────┴──────┘
```

**Detail:**
```
← ░░░░░       ← back button
░░░░░░░░░░    ← title
░░░░░░░       ← subtitle + status badge
┌─────────────────────────────────┐
│ ░░░░: ░░░░░░░  │ ░░░░: ░░░░░  │  ← detail grid
│ ░░░░: ░░░░░    │ ░░░░: ░░░░░░ │
└─────────────────────────────────┘
```

**Form:**
```
░░░░░░░░░░░░░    ← title
● ─── ● ─── ○ ─── ○    ← steps
░░░░░░░░░░░                    ← form labels + inputs
[░░░░░░░░░░░░░░░░░░░░]
░░░░░░░░░░░
[░░░░░░░░░░░░░░░░░░░░]
[░░░░░░░] [░░░░░░░]    ← buttons
```

### Implementation Notes
- All skeletons use `Skeleton` with `active={true}` for animated shimmer
- `@media (prefers-reduced-motion: reduce)`: disable shimmer animation
- Skeleton shapes roughly match the actual page layout

## 2.15 AppBreadcrumbs

**File:** `packages/ui/src/components/AppBreadcrumbs.tsx`

### Props Interface

```tsx
interface BreadcrumbItem {
  label: string;
  path?: string; // if no path, it's the current page (not a link)
}

interface AppBreadcrumbsProps {
  /** Items override. If not provided, auto-generated from current route */
  items?: BreadcrumbItem[];
  /** Custom separator */
  separator?: React.ReactNode;
  /** Additional class */
  className?: string;
}
```

### Auto-Generation Logic
- Reads current `location.pathname` from React Router
- Splits path segments, title-cases each
- Maps known path segments to labels: `/plants` → "Plant Management", `/transfers/outgoing` → "Outgoing Transfers"
- Last segment is current page (not linked), bold text

### Example
Route: `/plants/PLT-20250106-ABC`
```
Home > Plant Management > PLT-20250106-ABC
```

### Accessibility
- `<nav aria-label="Breadcrumb">`
- `<ol>` list structure
- Current page: `aria-current="page"`
- Separator: `aria-hidden="true"`

## 2.16 OfflineBanner

**File:** `packages/ui/src/components/OfflineBanner.tsx`

### Props Interface

```tsx
interface OfflineBannerProps {
  /** Number of pending sync operations */
  pendingSyncCount?: number;
  /** Additional class */
  className?: string;
}
```

### Visual Description
- Yellow warning bar, full-width, below header
- `WifiOff` icon + "You're offline — changes will sync when reconnected"
- If `pendingSyncCount > 0`: "({count} pending changes)"
- Slides down with animation when going offline, slides up when back online

### Implementation
```tsx
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### Accessibility
- `role="alert"` (announces immediately to screen readers)
- `aria-live="assertive"`

## 2.17 SyncStatus

**File:** `packages/ui/src/components/SyncStatus.tsx`

### Props Interface

```tsx
type SyncState = 'synced' | 'syncing' | 'pending' | 'error';

interface SyncStatusProps {
  /** Current sync state */
  state: SyncState;
  /** Number of pending items */
  pendingCount?: number;
  /** Click to retry failed sync */
  onRetry?: () => void;
  /** Compact badge mode vs expanded text mode */
  compact?: boolean;
  /** Additional class */
  className?: string;
}
```

### Visual States

| State | Icon | Color | Text |
|---|---|---|---|
| `synced` | `CheckCircle` (static) | `secondary-500` | "All synced" |
| `syncing` | `RefreshCw` (spinning) | `info-text` | "Syncing {count}..." |
| `pending` | `Clock` | `warning-text` | "{count} pending" |
| `error` | `AlertCircle` | `error-text` | "Sync failed" + retry button |

### Compact Mode
- Just the icon + badge count (no text)
- Tooltip reveals full text on hover

### Accessibility
- `aria-live="polite"` for state changes
- `aria-label="Sync status: 3 items pending"`

## 2.18 LanguageSwitcher

**File:** `packages/ui/src/components/LanguageSwitcher.tsx`

### Props Interface

```tsx
interface LanguageSwitcherProps {
  /** Current language code */
  currentLanguage: string;
  /** Language change handler */
  onLanguageChange: (langCode: string) => void;
  /** Display mode */
  variant?: 'dropdown' | 'inline';
  /** Additional class */
  className?: string;
}
```

### Supported Languages (SA Official)

| Code | Native Name | English Name |
|---|---|---|
| `en` | English | English |
| `af` | Afrikaans | Afrikaans |
| `zu` | isiZulu | Zulu |
| `xh` | isiXhosa | Xhosa |
| `st` | Sesotho | Sotho |
| `tn` | Setswana | Tswana |
| `ss` | Siswati | Swati |
| `ve` | Tshivenḓa | Venda |
| `ts` | Xitsonga | Tsonga |
| `nso` | Sesotho sa Leboa | Northern Sotho |
| `nr` | isiNdebele | Ndebele |

### Visual Description
- Globe icon (`Globe` from Lucide) + current language name
- Dropdown: Ant `Select` component with option groups
- Each option shows native name + English name in parentheses
- Current selection highlighted

### MVP Note
- Only English is fully implemented in MVP
- Other languages show as disabled with "Coming soon" label
- Infrastructure is ready for i18n integration (see Section 8)

### Accessibility
- `aria-label="Select language"`
- Each option has `lang` attribute set to its language code

## 2.19 CsvExportButton

**File:** `packages/ui/src/components/CsvExportButton.tsx`

### Props Interface

```tsx
interface CsvColumn {
  key: string;
  header: string;
  formatter?: (value: any) => string;
}

interface CsvExportButtonProps {
  /** Data array to export */
  data: Record<string, any>[];
  /** Column definitions */
  columns: CsvColumn[];
  /** Filename (without .csv extension) */
  filename: string;
  /** Button label */
  label?: string;         // default: "Export CSV"
  /** Loading state (for async data fetching before export) */
  loading?: boolean;
  /** Max rows before warning */
  maxRows?: number;        // default: 10000
  /** Disabled state */
  disabled?: boolean;
  /** Additional class */
  className?: string;
}
```

### Behavior
1. Click → if `data.length > maxRows`, show confirmation: "Export {count} rows? This may take a moment."
2. Generate CSV string using `columns` config
3. Create Blob → URL.createObjectURL → trigger download via hidden `<a>` element
4. Show `message.success("Export complete — {count} records")"`
5. Revoke object URL after download

### Visual Description
- Default: `<Button icon={<Download />}>Export CSV</Button>`
- type "default" (outlined) — not primary
- Loading state: spinning icon + "Exporting..."

### Accessibility
- `aria-label="Export {count} {entity} records as CSV file"`

## 2.20 PrintButton

**File:** `packages/ui/src/components/PrintButton.tsx`

### Props Interface

```tsx
interface PrintButtonProps {
  /** CSS selector for the content to print (default: main content area) */
  contentSelector?: string;    // default: '#main-content'
  /** Custom print title */
  title?: string;
  /** Button label */
  label?: string;              // default: "Print"
  /** Additional class */
  className?: string;
}
```

### Behavior
1. Click → `window.print()`
2. Print stylesheet (`@media print`):
   - Hide masthead, sidebar, footer, navigation
   - Hide action buttons, filters
   - Show full data tables (no pagination)
   - Government header + footer on every printed page
   - Tracking IDs in monospace
   - URLs printed next to links
3. Adds NCTS header + timestamp to printed output

### Print Stylesheet (global)

```css
@media print {
  .ncts-masthead,
  .ncts-sidebar,
  .ncts-bottom-nav,
  .ncts-footer,
  .ncts-no-print {
    display: none !important;
  }
  
  .ncts-print-header {
    display: block !important;
  }
  
  body {
    font-size: 12pt;
    color: #000;
    background: #fff;
  }
  
  a[href]::after {
    content: " (" attr(href) ")";
    font-size: 9pt;
    color: #595959;
  }
  
  .ant-table {
    page-break-inside: auto;
  }
  
  .ant-table-row {
    page-break-inside: avoid;
  }
}
```

## 2.21 SearchGlobal

**File:** `packages/ui/src/components/SearchGlobal.tsx`

### Props Interface

```tsx
interface SearchResult {
  id: string;
  type: 'plant' | 'facility' | 'transfer' | 'operator' | 'permit' | 'sale' | 'harvest';
  title: string;          // Display text (e.g., tracking ID or name)
  subtitle?: string;      // Secondary text (e.g., facility name, status)
  path: string;           // Navigation path
}

interface SearchGlobalProps {
  /** Async search function */
  onSearch: (query: string) => Promise<SearchResult[]>;
  /** Keyboard shortcut. Default: Ctrl+K / Cmd+K */
  shortcut?: string;
  /** Placeholder text */
  placeholder?: string;   // default: "Search plants, facilities, operators..."
  /** Additional class */
  className?: string;
}
```

### Visual Description
- Trigger: button in header showing `Search` icon + "Ctrl+K" hint
- Opens: centered command palette modal (40% top offset)
- Input field with large text, auto-focused
- Results grouped by entity type with icons
- Keyboard navigation: ↑/↓ to select, Enter to navigate, Esc to close
- Recent searches shown when input is empty (localStorage)
- Max 5 results per category, max 20 total

### Modal Layout

```
┌─────────────────────────────────────────┐
│ 🔍 Search plants, facilities, opera... │
│─────────────────────────────────────────│
│                                         │
│  🌱 Plants                             │
│    PLT-20250106-ABC — Active, Fac A    │
│    PLT-20250106-DEF — Flowering, Fac B │
│                                         │
│  🏢 Facilities                         │
│    GreenFields Cannabis — Cape Town    │
│                                         │
│  📄 Permits                            │
│    PRM-20250106-XYZ — Active          │
│                                         │
│─────────────────────────────────────────│
│  ↑↓ Navigate  ↵ Select  Esc Close     │
└─────────────────────────────────────────┘
```

### Accessibility
- Modal: `role="dialog"` + `aria-label="Global search"`
- Input: `role="combobox"` + `aria-expanded` + `aria-autocomplete="list"`
- Results list: `role="listbox"`, each result `role="option"`
- Active result: `aria-selected="true"` + visual highlight
- Keyboard shortcut announced via tooltip on trigger button

### Performance
- Debounce search by 300ms
- Cancel previous request on new input
- Show skeleton results while loading (3 placeholder items)
- Cache recent results for instant display

---

# Section 3: Operator Portal Pages (`apps/web/`)

All operator portal pages use `ProLayout` (Section 1.3) and are wrapped in `PageContainer`. Each page uses the existing TanStack Query hooks from `packages/api-client/`.

## 3.1 Operator Dashboard (`/dashboard`)

**File:** `apps/web/src/pages/DashboardPage.tsx`
**Current state:** 83 lines, 4 basic KPI cards, no charts or tables.

### Redesign Specification

#### KPI Row (Top)

4 `StatCard` components in a responsive row:

| Card | Label | Value Source | Icon | Trend | Sparkline |
|---|---|---|---|---|---|
| 1 | Active Plants | `usePlants({ status: 'active' })` count | `Sprout` (green bg) | vs previous 30 days | 7-day registration count |
| 2 | Pending Transfers | `useTransfers({ status: 'pending' })` count | `Truck` (orange bg) | vs previous 30 days | 7-day transfer volume |
| 3 | Monthly Sales | `useSales({ period: 'month' })` total value | `ShoppingCart` (blue bg) | vs previous month | 7-day sales value |
| 4 | Compliance Score | `useRegulatoryDashboard()` percentage | `ShieldCheck` (traffic-light bg) | vs previous assessment | Last 6 assessments |

Layout: `Row gutter={[16, 16]}` → 4 cols on `xl`, 2 cols on `md`, 1 col on `sm`.

#### Charts Row (Middle)

Two charts side by side in `Card` components:

**Chart 1: Plant Lifecycle Distribution** (Left, 50% width)
- Horizontal stacked bar or donut chart
- Segments: seedling, vegetative, flowering, harvested, destroyed
- Colors matching `StatusBadge` color mapping
- Hover: tooltip with count + percentage
- Library: `@ant-design/charts` (Pie or Column)

**Chart 2: Transfer Volume (30 Days)** (Right, 50% width)
- Line chart or area chart
- X-axis: dates (last 30 days)
- Y-axis: number of transfers
- Two lines: outgoing (blue) and incoming (green)
- Library: `@ant-design/charts` (Line)

Mobile: Stack vertically (100% width each).

#### Activity Feed (Bottom Left, 60% width)

A chronological feed of recent operations:

```tsx
interface ActivityItem {
  id: string;
  type: 'plant_registered' | 'transfer_initiated' | 'harvest_recorded' | 'lab_result' | 'sale_completed';
  description: string;
  timestamp: string;
  entityId: string;     // tracking ID link
}
```

- Ant `Timeline` component with custom icons per type
- Maximum 10 items on load, "View all" link
- Each item: icon + description + relative timestamp + tracking ID link
- Real-time: poll every 30s or use WebSocket if available

#### Alerts Panel (Bottom Right, 40% width)

```
┌─────────────────────────────────┐
│  ⚠ Active Alerts (3)     View All │
├─────────────────────────────────┤
│  🔴 Compliance violation: PLT-… │
│     2 hours ago                 │
│  🟡 Permit expiring in 28 days │
│     Yesterday                   │
│  🔵 Incoming transfer pending   │
│     3 hours ago                 │
└─────────────────────────────────┘
```

- Ant `Card` with `List` component
- Each alert: color indicator (semantic), message, relative time
- Clickable → navigate to relevant page
- Badge count on "Active Alerts" heading

#### Quick Actions Bar

Floating action area (below KPIs or as a secondary header row):

| Action | Icon | Route |
|---|---|---|
| Register Plant | `Plus` + `Sprout` | `/plants/register` |
| Record Harvest | `Plus` + `Wheat` | `/harvests/new` |
| Create Transfer | `Plus` + `Truck` | `/transfers/new` |
| Record Sale | `Plus` + `ShoppingCart` | `/sales/new` |

Desktop: horizontal button row. Mobile: speed-dial FAB (floating action button) with expandable options.

#### Page Loading
- Initial: `SkeletonPage variant="dashboard"`
- Individual cards: independent loading with `Spin` in card body
- Error per card: inline retry (don't fail the whole page)

## 3.2 Facilities Page (`/facilities`)

**File:** `apps/web/src/pages/FacilitiesPage.tsx`
**Current state:** 61 lines, basic table.

### Redesign Specification

#### Page Container

```tsx
<PageContainer
  title="Facilities"
  subTitle="Manage your cultivation and processing facilities"
  extra={[
    <Button key="add" type="primary" icon={<Plus size={16} />}>
      Add Facility
    </Button>,
  ]}
/>
```

#### Facility Cards View (Default)

Display facilities as cards rather than a table (operators typically have 1-5 facilities):

```
┌─────────────────────────────────────────┐
│  🏢 GreenFields Cannabis Farm           │
│  ● Active                   Cultivation │
│                                         │
│  📍 Western Cape, Cape Town             │
│     GPS: -33.9249, 18.4241              │
│                                         │
│  Plants: 234 active | Area: 5,000 m²   │
│  License: PRM-20250106-ABC              │
│                                         │
│  [View Details]  [Edit]                 │
└─────────────────────────────────────────┘
```

- Card with colored left border (type: cultivation=green, processing=blue)
- `StatusBadge` for active/inactive/suspended
- `Tag` for facility type
- Location with `MapPin` icon
- Key metrics: plant count, area
- License number as `TrackingId` component
- Cards in `Row` with `Col span={12}` (2-up on desktop, full on mobile)

#### Add/Edit Facility Drawer

Drawer (slide from right) with form fields:

| Field | Component | Validation |
|---|---|---|
| Facility Name | `Input` | Required, 3-100 chars |
| Facility Type | `Select`: cultivation, processing, distribution, retail | Required |
| Province | `Select`: 9 SA provinces | Required |
| City/Town | `Input` | Required |
| Street Address | `Input.TextArea` | Required |
| GPS Coordinates | Custom `GpsInput` (auto-detect + manual) | Required, valid lat/lng |
| Total Area (m²) | `InputNumber` | Required, > 0 |
| License Number | `Input` with format validation | Optional |
| Description | `Input.TextArea` | Optional, max 500 chars |

GPS Input: "Use my location" button + manual lat/lng fields + mini-map preview (static image).

#### Empty State
- `EntityEmptyState` with `Building2` icon
- "No facilities yet — Add your first facility to get started"

## 3.3 Plant Management Page (`/plants`)

**File:** `apps/web/src/pages/PlantsPage.tsx`
**Current state:** 77 lines, basic Ant Table.

### Redesign Specification

#### Page Container with Tabs

```tsx
<PageContainer
  title="Plant Management"
  subTitle={`${totalCount} plants registered`}
  tabList={[
    { key: 'all', tab: `All (${totalCount})` },
    { key: 'active', tab: `Active (${activeCount})` },
    { key: 'harvested', tab: `Harvested (${harvestedCount})` },
    { key: 'destroyed', tab: `Destroyed (${destroyedCount})` },
  ]}
  extra={[
    <CsvExportButton key="export" data={plants} filename="plants" columns={plantCsvColumns} />,
    <Button key="bulk" icon={<Upload size={16} />}>Bulk Import</Button>,
    <Button key="add" type="primary" icon={<Plus size={16} />}>Register Plant</Button>,
  ]}
/>
```

#### ProTable Configuration

Replace basic `Table` with `ProTable` from `@ant-design/pro-components`:

```tsx
<ProTable<Plant>
  columns={plantColumns}
  request={async (params, sort, filter) => {
    const data = await fetchPlants({ ...params, ...sort, ...filter });
    return { data: data.items, total: data.total, success: true };
  }}
  rowKey="id"
  search={{
    filterType: 'light',    // compact filter bar
    defaultCollapsed: true,
  }}
  toolBarRender={() => [...extraButtons]}
  pagination={{
    defaultPageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} plants`,
  }}
  options={{
    density: true,
    fullScreen: true,
    reload: true,
    setting: true, // column visibility toggle
  }}
  dateFormatter="string"
  headerTitle="Plants"
/>
```

#### Table Columns

| Column | Key | Width | Render | Sort | Filter |
|---|---|---|---|---|---|
| Tracking ID | `trackingId` | 200px | `<TrackingId id={id} size="sm" linkTo={`/plants/${id}`} />` | ✅ | Text search |
| Strain | `strain` | 150px | Text | ✅ | Select filter |
| Stage | `currentStage` | 130px | `<StatusBadge status={stage} variant="dot" />` | ✅ | Multi-select filter |
| Facility | `facilityName` | 180px | Link to facility | ✅ | Select filter |
| Planted Date | `plantedDate` | 130px | Formatted date | ✅ | Date range |
| Days in Stage | — | 100px | Computed: `daysSince(stageDate)` | ✅ | — |
| Last Activity | `updatedAt` | 130px | Relative time ("2h ago") | ✅ | — |
| Actions | — | 100px | `<Dropdown>` with View, Edit, Record Harvest, Destroy | — | — |

#### Row Expansion

Click row → expand to show `PlantLifecycle` stepper + key details:

```
┌──────────────────────────────────────────────────────┐
│ ● seed → ● seedling → ● vegetative → ◉ flowering    │
│                                                      │
│ Strain: Purple Haze    Batch: BTH-20250106-ABC       │
│ Mother Plant: PLT-20250105-XYZ                       │
│ Notes: Showing strong trichome development           │
└──────────────────────────────────────────────────────┘
```

#### Mobile View (<768px)
- Switch from table to card list
- Each card shows: tracking ID, strain, status badge, facility, days
- Swipe actions: view detail, record harvest
- Filter bar: horizontal scroll chips

#### Bulk Import Modal

Button: "Bulk Import" opens modal with:
1. Download CSV template link
2. File upload dropzone (`.csv` only, max 5MB)
3. Preview table (first 5 rows)
4. Validation errors shown per row
5. Confirm import button
6. Progress bar during import

## 3.4 Plant Registration Wizard (`/plants/register`)

**File:** `apps/web/src/pages/PlantRegisterPage.tsx`
**Current state:** 157 lines, 4-step StepsForm. Needs enhancement.

### Redesign Specification

Use `StepsForm` from `@ant-design/pro-components`:

#### Step 1: Source Information

| Field | Component | Validation | Notes |
|---|---|---|---|
| Source Type | `Radio.Group`: seed, clone, mother_plant | Required | |
| Mother Plant ID | `Select` with search | Required if clone | Search existing plants |
| Seed Lot Number | `Input` | Required if seed | |
| Supplier | `Input` | Optional | |
| Acquired Date | `DatePicker` | Required, ≤ today | |
| Acquisition Document | `Upload` (single file) | Optional | PDF/image, max 10MB |

#### Step 2: Plant Details

| Field | Component | Validation | Notes |
|---|---|---|---|
| Strain Name | `AutoComplete` (from existing strains) | Required | |
| Strain Type | `Select`: indica, sativa, hybrid, ruderalis | Required | |
| Assigned Facility | `Select` (user's facilities) | Required | |
| Growing Area / Zone | `Input` | Optional | |
| Growing Medium | `Select`: soil, hydroponic, aeroponic, coco_coir | Required | |
| Expected Flowering Weeks | `InputNumber` (6-14) | Optional | |
| Notes | `Input.TextArea` | Optional, max 1000 chars | |

#### Step 3: Identification

| Field | Component | Validation | Notes |
|---|---|---|---|
| Auto-generated Tracking ID | Display only (monospace) | — | `PLT-{YYYYMMDD}-{XXX}` format |
| Physical Tag Type | `Select`: rfid, barcode, qr_code, label | Required | |
| Physical Tag Number | `Input` | Required | |
| QR Code Preview | Generated QR image | — | `<QRCode value={trackingId} />` from `@ncts/qr-lib` |
| Photo of Plant | `Upload` (image) | Optional | Camera capture on mobile |

#### Step 4: Review & Confirm

- Summary card showing all entered information
- `PlantLifecycle` component showing initial stage (seed/seedling)
- Generated QR code with print button
- Checkbox: "I confirm this information is accurate and I am authorized to register this plant"
- Submit button: "Register Plant"

#### Success State

After successful registration:
```
┌──────────────────────────────────────┐
│          ✅ Plant Registered!         │
│                                      │
│    PLT-20250106-ABC                  │
│    [QR Code Image]                   │
│                                      │
│  [Print Label]  [Register Another]   │
│              [View Plant →]          │
└──────────────────────────────────────┘
```

## 3.5 Plant Detail Page (`/plants/:id`)

**New page (not yet implemented)**

### Specification

#### Page Header

```tsx
<PageContainer
  title={<><TrackingId id={plant.trackingId} size="lg" /> — {plant.strain}</>}
  subTitle={<StatusBadge status={plant.currentStage} size="lg" />}
  extra={[
    <PrintButton key="print" />,
    <Button key="harvest" type="primary" icon={<Wheat size={16} />} disabled={plant.currentStage === 'harvested'}>
      Record Harvest
    </Button>,
    <Dropdown key="more" menu={{ items: plantActions }}>
      <Button icon={<MoreHorizontal size={16} />} />
    </Dropdown>,
  ]}
  breadcrumb={{ items: [...] }}
/>
```

#### Content Layout

**Top: Plant Lifecycle Stepper** — Full-width `PlantLifecycle` component with dates

**Left Column (60%): Details**

`Descriptions` component (Ant) with:

| Label | Value |
|---|---|
| Tracking ID | `TrackingId` component |
| Strain | Name + type tag (indica/sativa/hybrid) |
| Source | Type + mother plant link (if clone) |
| Facility | Link to facility page |
| Growing Zone | Text |
| Growing Medium | Text |
| Planted Date | Formatted date |
| Days Active | Computed |
| Current Stage | `StatusBadge` |
| Stage Duration | "X days in {stage}" |
| Physical Tag | Type + number |

**Right Column (40%): QR Code & Photo**

- QR code preview (downloadable, printable)
- Plant photo (if uploaded) with lightbox
- "Update Photo" button

**Bottom: Tabbed Sections**

| Tab | Content |
|---|---|
| Activity Log | Timeline of all state changes, entries, modifications |
| Lab Results | Table of associated lab results with status badges |
| Transfers | Table of transfers involving this plant |
| Documents | Uploaded files (acquisition docs, photos) |
| Audit Trail | `@ncts/audit-lib` entries — who changed what when |

#### Mobile Layout
- Single column, all sections stacked
- Lifecycle stepper → vertical orientation
- Tabs → scrollable horizontal tabs
- Actions → FAB with dropdown

## 3.6 Harvests Page (`/harvests`)

**File:** `apps/web/src/pages/HarvestsPage.tsx`
**Current state:** 64 lines, basic table.

### Redesign Specification

#### ProTable Columns

| Column | Key | Width | Render | Sort | Filter |
|---|---|---|---|---|---|
| Harvest ID | `trackingId` | 180px | `TrackingId` | ✅ | Search |
| Plants | `plantCount` | 80px | Count badge | ✅ | — |
| Facility | `facilityName` | 180px | Link | ✅ | Select |
| Harvest Date | `harvestDate` | 130px | Date | ✅ | Date range |
| Wet Weight (g) | `wetWeight` | 120px | Number formatted | ✅ | Range slider |
| Dry Weight (g) | `dryWeight` | 120px | Number formatted | ✅ | Range slider |
| Yield % | — | 80px | Computed `(dry/wet)*100` with color coding | ✅ | — |
| Status | `status` | 120px | `StatusBadge` | ✅ | Multi-select |
| Lab Test | `labStatus` | 120px | `StatusBadge` or "—" | — | — |
| Actions | — | 80px | View, Edit, Submit for Lab | — | — |

#### Record Harvest Flow

Modal or drawer with `StepsForm`:

**Step 1: Select Plants**
- Multi-select table of flowering plants
- Filter by facility
- Show plant tracking IDs, strain, days in flowering

**Step 2: Harvest Details**
| Field | Component | Validation |
|---|---|---|
| Harvest Date | `DatePicker` | Required, ≤ today |
| Harvest Method | `Select`: manual, machine | Required |
| Wet Weight (g) | `InputNumber` | Required, > 0 |
| Dry Weight (g) | `InputNumber` | Optional (can add later), ≤ wet weight |
| Drying Method | `Select`: hang_dry, rack_dry, machine | Optional |
| Storage Location | `Input` | Optional |
| Notes | `TextArea` | Optional |

**Step 3: Review & Confirm**
- Summary with plant list, weights, computed yield
- "I confirm these harvest measurements are accurate"

## 3.7 Lab Results Page (`/lab-results`)

**File:** `apps/web/src/pages/LabResultsPage.tsx`
**Current state:** 97 lines, expandable rows.

### Redesign Specification

#### ProTable Columns

| Column | Key | Width | Render |
|---|---|---|---|
| Sample ID | `sampleId` | 180px | `TrackingId` |
| Harvest | `harvestId` | 180px | `TrackingId` link |
| Lab Name | `labName` | 160px | Text |
| Submitted Date | `submittedDate` | 130px | Date |
| Result Date | `resultDate` | 130px | Date or "Pending" |
| Status | `status` | 120px | `StatusBadge` (passed/failed/pending/in_progress) |
| THC % | `thcPercent` | 80px | Number with compliance indicator |
| CBD % | `cbdPercent` | 80px | Number |
| Actions | — | 80px | View, Download CoA |

#### Row Expansion: Detailed Results

Expandable row shows full lab panel:

```
┌────────────────────────────────────────────────────────┐
│  Cannabinoid Profile          │  Contaminant Screen    │
│  ─────────────────            │  ──────────────────    │
│  THC: 18.5%    ✅ Within limit│  Pesticides: Pass ✅  │
│  CBD: 0.8%                    │  Heavy Metals: Pass ✅ │
│  CBN: 0.2%                    │  Microbials: Pass ✅   │
│  CBG: 0.1%                    │  Mycotoxins: Pass ✅   │
│                               │  Residual Solvents: -  │
│  Terpene Profile              │                        │
│  ──────────────               │  Certificate: [📄 CoA] │
│  Myrcene: 0.8%                │                        │
│  Limonene: 0.5%               │                        │
│  Pinene: 0.3%                 │                        │
└────────────────────────────────────────────────────────┘
```

- Compliance thresholds shown visually (red highlights for failures)
- Certificate of Analysis (CoA) download button
- Link to harvest and associated plants

## 3.8 Transfers Page (`/transfers`)

**File:** `apps/web/src/pages/TransfersPage.tsx`
**Current state:** 73 lines, basic table.

### Redesign Specification

#### Page Tabs

| Tab | Description |
|---|---|
| All Transfers | Full transfer history |
| Outgoing | Transfers initiated by this operator |
| Incoming | Transfers received by this operator |
| Pending Action | Transfers requiring operator response |

#### ProTable Columns

| Column | Key | Width | Render |
|---|---|---|---|
| Transfer ID | `trackingId` | 180px | `TrackingId` |
| Direction | — | 80px | `↑ Out` (blue) or `↓ In` (green) tag |
| From Facility | `fromFacility` | 170px | Name + location |
| To Facility | `toFacility` | 170px | Name + location |
| Items | `itemCount` | 80px | "{n} plants" or "{weight} g" |
| Status | `status` | 130px | `StatusBadge` (transfer statuses) |
| Created | `createdAt` | 120px | Date |
| ETA | `estimatedArrival` | 120px | Date or relative time |
| Actions | — | 100px | Context-dependent buttons |

#### Transfer Detail View (`/transfers/:id`)

New page with:

1. **Transfer Header**: IDs, from→to facilities, status badge
2. **TransferTimeline** component (Section 2.10): full event timeline
3. **Manifest Table**: list of plants/products being transferred
4. **Documents Tab**: shipping manifest, COA copies, inspection reports
5. **Action Buttons** (context-dependent):

| Current Status | Available Actions |
|---|---|
| `draft` | Edit, Submit, Delete |
| `initiated` | Cancel, Edit Manifest |
| `dispatched` | Update Vehicle Info |
| `in_transit` | — (view only) |
| `received` | Verify Manifest, Report Discrepancy |

#### Create Transfer Wizard

`StepsForm`:

**Step 1: Destination**
- Select destination facility (from registered facilities in system)
- Or enter new external facility details
- Estimated arrival date/time

**Step 2: Manifest**
- Multi-select table of plants/products from source facility
- Show: tracking ID, strain, weight, stage
- Running total: X plants, Y grams

**Step 3: Transport Details**
- Vehicle registration number
- Driver name and ID
- Planned route (optional text)
- Security measures (checkbox list)

**Step 4: Review & Initiate**
- Full manifest summary
- QR code for shipment tracking
- "I authorize this transfer" checkbox
- "Initiate Transfer" button

## 3.9 Sales Page (`/sales`)

**File:** `apps/web/src/pages/SalesPage.tsx`
**Current state:** 63 lines, basic table.

### Redesign Specification

#### ProTable Columns

| Column | Key | Width | Render |
|---|---|---|---|
| Sale ID | `trackingId` | 180px | `TrackingId` |
| Buyer | `buyerName` | 170px | Name + license badge |
| Products | `productSummary` | 200px | Brief description |
| Quantity | `totalQuantity` | 100px | Weight/count formatted |
| Value (ZAR) | `totalValue` | 120px | `R {formatted}` |
| Sale Date | `saleDate` | 130px | Date |
| Status | `status` | 120px | `StatusBadge` |
| Actions | — | 80px | View, Invoice, Void |

#### Record Sale Drawer

| Field | Component | Validation |
|---|---|---|
| Buyer License Number | `Input` with validation lookup | Required, must be valid operator |
| Buyer Name | Auto-populated from license | Read-only |
| Sale Date | `DatePicker` | Required, ≤ today |
| Products | Transfer-from manifest selector | Required, ≥ 1 item |
| Unit Price (ZAR) | `InputNumber` per item | Required, > 0 |
| Total Value | Computed | Display only |
| Payment Method | `Select`: bank_transfer, cash, eft, other | Required |
| Invoice Number | `Input` | Optional |
| Notes | `TextArea` | Optional |

#### Sale Detail Page (`/sales/:id`)

- Header: sale ID, buyer info, date, status
- Products table: each item with tracking ID, quantity, price
- Financial summary: subtotal, VAT (15%), total
- Documents: invoice PDF, proof of payment
- Audit trail

## 3.10 Operator Profile & Settings (`/profile`, `/settings`)

**New pages (not yet implemented)**

### Profile Page (`/profile`)

| Section | Content |
|---|---|
| Operator Info | Company name, registration number, license type, contact details |
| Facilities Summary | Count + links to each facility |
| Account Details | Primary contact, email, phone |
| Activity Stats | Total plants, transfers, sales this month |

### Settings Page (`/settings`)

Tabbed layout:

| Tab | Content |
|---|---|
| General | Operating hours, timezone, notifications preferences |
| Notifications | Email/SMS preferences per event type (toggle table) |
| API Keys | View/regenerate API key for integrations |
| Data Export | Full data export (POPIA right to data portability) |
| Danger Zone | Deactivate account request |

---

# Section 4: Government Dashboard Pages (`apps/admin/`)

All government dashboard pages use `ProLayout` (Section 1.4) and are designed for regulatory oversight.

## 4.1 National Overview Dashboard (`/dashboard`)

**File:** `apps/admin/src/pages/NationalDashboard.tsx`
**Current state:** 73 lines, 6 static KPI cards.

### Redesign Specification

#### Top-Level KPI Strip

6 `StatCard` components:

| Card | Label | Value Source | Icon | Color |
|---|---|---|---|---|
| 1 | Total Operators | `useOperators()` count | `Users` | Primary blue |
| 2 | Active Permits | `usePermits({ status: 'active' })` count | `FileCheck` | Secondary green |
| 3 | Total Plants Tracked | `usePlants()` count | `Sprout` | Success green |
| 4 | Active Transfers | `useTransfers({ status: 'in_transit' })` count | `Truck` | Warning orange |
| 5 | Monthly Revenue (ZAR) | `useSalesAggregate('month')` value | `DollarSign` | Primary blue |
| 6 | Avg Compliance Score | `useComplianceAverage()` percentage | `ShieldCheck` | Traffic-light |

Layout: 6 across on `xxl`, 3×2 on `xl`, 2×3 on `md`, 1×6 scrollable on `sm`.

#### Map Section (Primary Visual)

Full-width map showing facility locations across South Africa:

```
┌──────────────────────────────────────────────┐
│  Facilities Map                 [Filters ▾]  │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │     [SA Map with facility markers]     │  │
│  │      🟢 Active  🟡 Pending  🔴 Issue  │  │
│  │                                        │  │
│  │     (Click marker for facility card)   │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│  Province breakdown: WC:45  GP:38  KZN:22... │
└──────────────────────────────────────────────┘
```

- Use Leaflet or Mapbox GL JS with OpenStreetMap tiles
- Markers color-coded by facility status
- Cluster markers when zoomed out
- Click: popup with facility name, operator, plant count, compliance score
- Province summary bar below map
- Respect offline: cache tile layers, show placeholder when offline

#### Supply Chain Overview (Bottom Section)

**Left (50%): Flow Diagram**

Sankey-style or simplified flow showing national supply chain:
```
Cultivation → Processing → Distribution → Retail
  (n plants)   (n kg)       (n transfers)  (n sales)
```
- Each stage shows aggregate counts
- Color intensity based on volume
- Use `@ant-design/charts` Sankey or custom SVG

**Right (50%): Compliance Heatmap**

Table showing compliance scores by province:

| Province | Operators | Avg Score | Alerts |
|---|---|---|---|
| Western Cape | 45 | `ComplianceScore` 94% | 3 |
| Gauteng | 38 | `ComplianceScore` 87% | 8 |
| KwaZulu-Natal | 22 | `ComplianceScore` 91% | 2 |
| ... | ... | ... | ... |

Rows clickable → drill down to province view.

#### Recent Activity Log

Same pattern as operator dashboard activity feed, but system-wide. Shows:
- New operator registrations
- Permit applications/approvals
- Compliance alerts triggered
- Transfer completions
- System events

## 4.2 Operators Page (`/operators`)

**File:** `apps/admin/src/pages/OperatorsPage.tsx`
**Current state:** 53 lines, basic table.

### Redesign Specification

#### ProTable Columns

| Column | Key | Width | Render |
|---|---|---|---|
| Operator Name | `name` | 200px | Name + company logo/avatar |
| Registration # | `registrationNumber` | 160px | `TrackingId` |
| License Type | `licenseType` | 130px | `Tag` colored by type |
| Province | `province` | 130px | Text |
| Facilities | `facilityCount` | 80px | Count badge |
| Active Plants | `plantCount` | 100px | Number |
| Compliance | `complianceScore` | 100px | `ComplianceScore size="sm"` |
| Permit Status | `permitStatus` | 120px | `StatusBadge` |
| Registered | `createdAt` | 120px | Date |
| Actions | — | 80px | View, Suspend, Flag |

#### Operator Detail Page (`/operators/:id`)

New page with comprehensive view:

**Header:** Operator name, registration number, status badge, "Suspend" / "Flag" actions

**Tabs:**

| Tab | Content |
|---|---|
| Overview | Company details, contact info, license summary, compliance score ring |
| Facilities | Table of operator's facilities with status and plant counts |
| Plants | ProTable of all plants across facilities |
| Permits | List of all permits/licenses with current status |
| Transfers | Transfer history (incoming + outgoing) |
| Sales | Sales records |
| Compliance | Detailed compliance history, alerts, inspection reports |
| Audit Log | Full audit trail of operator activities |

## 4.3 Permits Management Page (`/permits`)

**File:** `apps/admin/src/pages/PermitsPage.tsx`
**Current state:** 65 lines, basic table.

### Redesign Specification

#### Page Tabs

| Tab | Count | Description |
|---|---|---|
| All Permits | Total | All permits in system |
| Pending Review | Pending | Awaiting government review |
| Active | Active | Currently valid permits |
| Expired | Expired | Past expiry date |
| Suspended/Revoked | Count | Enforcement actions |

#### ProTable Columns

| Column | Key | Width | Render |
|---|---|---|---|
| Permit # | `permitNumber` | 180px | `TrackingId` |
| Operator | `operatorName` | 180px | Link to operator |
| Type | `type` | 130px | `Tag` colored by type |
| Status | `status` | 120px | `StatusBadge` |
| Issued Date | `issuedDate` | 120px | Date |
| Expiry Date | `expiryDate` | 120px | Date + days remaining |
| Conditions | `conditionsCount` | 80px | Count with warning if unmet |
| Province | `province` | 120px | Text |
| Actions | — | 120px | Review, Approve, Suspend, Revoke |

#### Permit Detail Page (`/permits/:id`)

**File:** `apps/admin/src/pages/PermitDetailPage.tsx`
**Current state:** 82 lines. Needs expansion.

**Header:** Permit number, type tag, status badge, operator link

**Content:**

**Left (60%):** `Descriptions` component
| Label | Value |
|---|---|
| Permit Number | Monospace display |
| Operator | Link with compliance score |
| Type | Cultivation / Processing / etc. |
| Status | StatusBadge with detail |
| Issued | Date |
| Expires | Date + countdown |
| Province | Text |
| Issuing Authority | Name |

**Right (40%):** `PermitCard` visual representation

**Conditions Table:**

| # | Condition | Status | Due Date | Evidence |
|---|---|---|---|---|
| 1 | Annual inspection | Met ✅ | 2025-06-01 | Inspection report link |
| 2 | Monthly reporting | Met ✅ | Monthly | Last: Jan 2025 |
| 3 | Security measures | ⚠ Pending | 2025-03-01 | Required: CCTV upgrade |

**Action Buttons (by status):**

| Current Status | Actions |
|---|---|
| `pending` | Approve, Reject (with reason), Request Info |
| `active` | Suspend (with reason), Add Condition |
| `suspended` | Reinstate, Revoke (with reason) |
| `expired` | Archive, Renewal reminder |

**Review Workflow Modal:**

When reviewing a pending permit:
1. Checklist of required documents (all must be confirmed)
2. Conditions to attach (add/remove from template list)
3. Decision: Approve / Reject / Request Additional Information
4. If reject: mandatory reason text (min 50 chars)
5. Digital signature / confirmation
6. Email notification preview to operator

## 4.4 Compliance Page (`/compliance`)

**File:** `apps/admin/src/pages/CompliancePage.tsx`
**Current state:** 77 lines, basic overview.

### Redesign Specification

#### Overview Section

**Top Row:**
```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   National Avg   │ │  Active Alerts   │ │  Inspections Due │
│                  │ │                  │ │                  │  
│  ComplianceScore │ │      [15]        │ │      [8]         │
│      92%         │ │  🔴 3  🟡 7  🔵 5│ │   This month     │
│                  │ │                  │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

**Compliance Distribution Chart:**
- Histogram or distribution curve of operator compliance scores
- Segments: ≥95% (green), 80-94% (yellow), <80% (red)
- Count in each segment

**Compliance Trend Line:**
- 12-month trend of national average compliance score
- Target line at 95%

#### Active Alerts Table

| Column | Width | Render |
|---|---|---|
| Severity | 80px | Color dot: critical(red), major(orange), minor(yellow) |
| Operator | 180px | Link |
| Alert Type | 200px | Description |
| Triggered | 120px | Relative time + date |
| Status | 120px | Open / Investigating / Resolved |
| Assigned To | 150px | Admin user name |
| Actions | 100px | Investigate, Dismiss, Escalate |

#### Alert Types

| Category | Alert | Severity |
|---|---|---|
| Inventory | Unaccounted plant loss > 5% | Critical |
| Inventory | Weight discrepancy > 10% | Major |
| Transfer | Transfer not received within 48h | Major |
| Transfer | Unregistered vehicle | Minor |
| Lab | THC above regulatory limit | Critical |
| Lab | Failed contaminant screen | Critical |
| Permit | Permit expires within 30 days | Minor |
| Permit | Operating without valid permit | Critical |
| Reporting | Monthly report overdue > 7 days | Major |
| Security | After-hours facility access | Minor |

## 4.5 Facilities Map Page (`/facilities/map`)

**File:** `apps/admin/src/pages/FacilitiesMapPage.tsx`
**Current state:** 54 lines, table placeholder (no map).

### Redesign Specification

#### Full-Page Interactive Map

- Leaflet + OpenStreetMap (avoid Google Maps for government)
- South Africa centered, bounded
- Facility markers with clustering
- Color by: status (active/inactive/suspended) or compliance score (traffic light)
- Toggle between color modes

#### Map Controls

| Control | Description |
|---|---|
| Search | Search by facility name, operator, or location |
| Filter by Province | Multi-select dropdown |
| Filter by Type | cultivation, processing, distribution, retail |
| Filter by Status | active, inactive, suspended |
| Color Mode | Toggle: status / compliance |
| Zoom Controls | Standard +/- controls |
| Full Screen | Maximize map view |

#### Facility Popup

Click marker → popup card:
```
┌──────────────────────────────┐
│ GreenFields Cannabis Farm    │
│ ● Active        Cultivation  │
│                              │
│ Operator: ABC Cannabis Ltd   │
│ Plants: 234 active           │
│ Compliance: 94%              │
│ Last Inspection: 2025-01-01  │
│                              │
│ [View Facility Details →]    │
└──────────────────────────────┘
```

#### Side Panel (Desktop)

Right side panel (30% width) showing filtered facility list:
- Scrollable list matching current map filters
- Click item → fly-to on map + open popup
- Province breakdown statistics

#### Offline Fallback
- When offline, show cached province-level data in table format
- "Map unavailable offline — showing cached data" notice

## 4.6 Reports Page (`/reports`)

**New page (not yet implemented)**

### Report Types

#### Monthly Report (`/reports/monthly`)

| Section | Content |
|---|---|
| Period Selector | Month/year picker |
| National Summary | KPIs for the month: new operators, permits issued, plants registered, transfers completed, sales volume |
| Province Breakdown | Table: each province's numbers |
| Compliance Summary | Score distribution, alerts triggered, resolved |
| Charts | Line charts comparing to previous months |
| Export | PDF generation, CSV data download |

#### INCB Export (`/reports/incb`)

International Narcotics Control Board annual reporting:

| Field | Data Source |
|---|---|
| Total Cultivation Area | Sum of all active facility areas |
| Total Plants | Count all plants registered this year |
| Total Production (kg) | Sum dry weights of all harvests |
| Total Exports | Sum transfers to international destinations (if applicable) |
| Total Destruction | Sum destroyed plant weights |

- Generate in INCB-required format (CSV with specific columns)
- Year selector
- Preview before export
- Digital signature by authorized official

#### Custom Report Builder (`/reports/custom`)

Drag-and-drop report builder:
1. Select data sources (plants, transfers, sales, compliance)
2. Choose dimensions (time period, province, operator, facility type)
3. Choose metrics (count, sum, average)
4. Preview results as table and chart
5. Save report template for reuse
6. Schedule automated email delivery

## 4.7 Audit Log Page (`/audit`)

**New page (not yet implemented)**

### ProTable Configuration

| Column | Width | Render |
|---|---|---|
| Timestamp | 160px | Full datetime |
| Actor | 160px | User name + role badge |
| Action | 150px | `Tag` colored by type: create(green), update(blue), delete(red), view(gray) |
| Entity | 100px | Entity type tag |
| Entity ID | 180px | `TrackingId` link |
| Description | 300px | Human-readable change summary |
| IP Address | 130px | Text (masked last octet for POPIA) |

### Filters

| Filter | Type |
|---|---|
| Date Range | DatePicker range |
| Actor | Select (admin users) |
| Action Type | Multi-select: create, update, delete, view, login, export |
| Entity Type | Multi-select: plant, transfer, sale, operator, permit, facility |
| Entity ID | Text search |

### Detail Drawer

Click row → drawer shows:
- Full change diff (before/after JSON for updates)
- Actor details (name, role, IP, user agent)
- Related audit entries (same entity or same session)
- Timestamp with timezone

### Data Retention Notice

Banner at top: "Audit records are retained for 7 years per POPIA and regulatory requirements."

## 4.8 System Settings Page (`/settings`)

**New page (not yet implemented)**

### Tabs

| Tab | Content |
|---|---|
| General | System name, support contact, maintenance mode toggle |
| Compliance Thresholds | Editable threshold table: which metrics trigger which alert severity |
| Admin Users | User management: add/remove admins, role assignment |
| Integrations | SARS, SAHPRA connection status, API endpoints, test connection buttons |
| Notifications | System-wide notification templates, delivery schedule |
| Data Retention | POPIA retention policies per entity type, purge schedule |

### Compliance Thresholds Editor

Editable `ProTable`:

| Metric | Minor Threshold | Major Threshold | Critical Threshold | Active |
|---|---|---|---|---|
| Inventory loss % | 2% | 5% | 10% | ✅ |
| Transfer delay (hrs) | 24 | 48 | 72 | ✅ |
| Weight discrepancy % | 3% | 10% | 20% | ✅ |
| Report overdue (days) | 3 | 7 | 14 | ✅ |
| THC limit (%) | — | — | Regulatory | ✅ |

Each row inline-editable with save/revert buttons.

---

## 4.9 Inspection Management Page (`/compliance/inspections`)

**New page (not yet implemented)**

Referenced in Plan.md Phase 3.4 ("Schedule inspections, record findings, track remediation"). This page is a sub-route of the Compliance section, linked from the Compliance page sidebar and the "Inspections" tab.

### Route Structure

| Route | View | Component |
|---|---|---|
| `/compliance/inspections` | Calendar/list view | `InspectionsPage.tsx` |
| `/compliance/inspections/new` | Create inspection | `CreateInspectionPage.tsx` |
| `/compliance/inspections/:id` | Inspection detail/record | `InspectionDetailPage.tsx` |

### 4.9.1 Inspection Calendar View (`/compliance/inspections`)

#### Layout

```
┌──────────────────────────────────────────────────────────┐
│  Inspections                        [+ Schedule] [List]  │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │              Calendar (Month View)                 │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │  │
│  │  │Mon  │ │Tue  │ │Wed  │ │Thu  │ │Fri  │ ...     │  │
│  │  │     │ │ 🟢  │ │     │ │ 🟡  │ │     │        │  │
│  │  │     │ │ 🔵  │ │     │ │     │ │ 🔴  │        │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Upcoming Inspections (Next 7 Days)                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Date      │ Facility        │ Type     │ Inspector │  │
│  │ 2025-01-15│ Cape Town Grow  │ Routine  │ J. Nkosi  │  │
│  │ 2025-01-16│ Durban Process  │ Follow-up│ A. Botha  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

#### Calendar Component

- **Library:** Ant Design `Calendar` component (full-size mode)
- **Color coding:** 
  - 🟢 Green dot = Completed, passed
  - 🟡 Yellow dot = Scheduled, upcoming
  - 🔵 Blue dot = In progress
  - 🔴 Red dot = Completed, failed / overdue
- **Click handler:** Day click opens popover with that day's inspections; click inspection → navigates to detail
- **View toggle:** Calendar / List view (uses `Segmented` control)

#### List View (Alternate)

`ProTable` with columns:

| Column | Type | Sort | Filter |
|---|---|---|---|
| Inspection ID | `Tag` link | — | Text search |
| Facility | Link to facility | A-Z | Dropdown (all facilities) |
| Type | `Tag` (Routine / Complaint / Follow-up / Random) | — | Multi-select |
| Scheduled Date | Date | Default desc | Date range picker |
| Inspector | Text | A-Z | Text search |
| Status | `Badge` (Scheduled / In Progress / Completed / Overdue) | — | Multi-select |
| Outcome | `Tag` (Pass / Conditional / Fail / Pending) | — | Multi-select |
| Actions | View button | — | — |

#### Data Source

- **Hook:** `useInspections()` (new — see Section 12: Missing API Hooks Gap List)
- **Filters:** facility, type, status, date range, inspector
- **Pagination:** Server-side, 20 per page

### 4.9.2 Schedule Inspection Form (`/compliance/inspections/new`)

#### Form Layout

Uses `StepsForm` (ProComponents) with 3 steps:

**Step 1: Inspection Details**

| Field | Component | Validation | Source |
|---|---|---|---|
| Facility | `ProFormSelect` with search | Required | `useFacilities()` |
| Inspection Type | `ProFormRadio.Group` | Required | Routine / Complaint / Follow-up / Random |
| Priority | `ProFormSelect` | Required | Low / Medium / High / Critical |
| Scheduled Date | `ProFormDateTimePicker` | Required, future date | — |
| Estimated Duration | `ProFormDigit` (hours) | Required, min 0.5 | — |
| Reason / Notes | `ProFormTextArea` | Required for Complaint/Follow-up | — |

**Step 2: Assign Inspector**

| Field | Component | Validation | Source |
|---|---|---|---|
| Lead Inspector | `ProFormSelect` with search | Required | Admin users list |
| Additional Inspectors | `ProFormSelect` mode="multiple" | Optional | Admin users list |
| Notification | `ProFormCheckbox.Group` | — | Email inspector / Email facility / SMS facility |

**Step 3: Inspection Checklist**

Pre-populated checklist based on inspection type:

| Type | Default Checklist Items |
|---|---|
| Routine | Cultivation area, Security systems, Record keeping, Waste disposal, Plant tagging, Storage conditions, Staff credentials |
| Complaint | Specific complaint items + relevant routine items |
| Follow-up | Previous non-compliance items only |
| Random | Full routine checklist |

Checklist items displayed as editable `Transfer` (dual listbox) — move items from "Available" to "Included".

**Submit:** Creates inspection record, sends notifications, adds to calendar.

### 4.9.3 Inspection Detail / Recording Page (`/compliance/inspections/:id`)

#### Header

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Inspections                                   │
│                                                          │
│  Inspection #INS-2025-00142           [Edit] [Cancel]    │
│  Status: ● Scheduled                                     │
│  Facility: Cape Town Cultivation Facility                │
│  Date: 2025-01-15 09:00  │  Inspector: J. Nkosi         │
│  Type: Routine  │  Priority: Medium                      │
└──────────────────────────────────────────────────────────┘
```

#### Recording Section (Inspector fills in during/after visit)

Displayed when status is "In Progress" or "Completed":

**Checklist Recording:**

Each checklist item is a collapsible `Panel`:

```
┌──────────────────────────────────────────────────────────┐
│  ☑ Cultivation Area Inspection          [Pass ▾]         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Findings: [Rich text editor]                       │  │
│  │ Evidence: [Upload photos/documents]                │  │
│  │ Severity: ○ None ○ Minor ○ Major ○ Critical       │  │
│  │ Remediation Required: [Yes/No]                     │  │
│  │ Remediation Deadline: [Date picker]                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Overall Assessment:**

| Field | Component |
|---|---|
| Overall Outcome | Radio: Pass / Conditional Pass / Fail |
| Summary | Rich text editor |
| Remediation Plan | Text area (required if Conditional/Fail) |
| Follow-up Required | Toggle + date picker |
| Sign-off | Digital signature canvas (`react-signature-canvas`) |

#### Inspection Timeline

Right sidebar showing audit trail:

```
Timeline:
  ● Created by Admin on 2025-01-10
  ● Assigned to J. Nkosi on 2025-01-10
  ● Notification sent on 2025-01-10
  ● Started by J. Nkosi on 2025-01-15 09:05
  ● Completed on 2025-01-15 14:30
  ● Report generated on 2025-01-15 14:35
```

#### PDF Report Generation

"Generate Report" button creates downloadable PDF:
- Government letterhead with SAHPRA / DALRRD branding
- Facility details + inspection metadata
- Checklist results with evidence photos
- Overall assessment and remediation plan
- Inspector signature and date

**Library:** `@react-pdf/renderer` (consistent with other report generation in the system).

### 4.9.4 Inspection History & Analytics

Sub-tab on Compliance page showing aggregated inspection data:

| Metric | Visualization |
|---|---|
| Inspections per month | Bar chart (12-month trend) |
| Pass/Fail rate | Donut chart |
| Avg remediation time | Line chart |
| Non-compliance by category | Horizontal bar chart |
| Inspections by province | Choropleth map overlay |

**Data Source:** `useInspectionAnalytics()` (new — see Section 12: Missing API Hooks Gap List)

---

*Sections 5–8 follow.*

---

# Section 5: Public Verification App (`apps/verify/`)

The verification app is public-facing — used by consumers, law enforcement, and regulators to verify cannabis product authenticity via QR code or tracking ID. It must be fast, accessible, and work on any device.

## 5.1 Technology Stack Change

**Current state:** Plain React with no Shadcn/UI or Tailwind installed.

**Target stack:**
- **Shadcn/ui** components (Button, Input, Card, Badge, Skeleton)
- **Tailwind CSS v3** for utility styling
- **Radix UI** primitives (via Shadcn)
- **@ncts/qr-lib** for QR scanning/decoding
- **No Ant Design** — must be lightweight (target <100KB JS gzipped)

### Why Separate Stack
- Public-facing: must load fast on 3G connections
- No login required: no auth overhead
- Simple UI: only 2-3 pages, doesn't need ProLayout
- Tailwind tree-shakes unused CSS → tiny bundle
- Target: First Contentful Paint <2s on 3G

### Installation

```bash
cd apps/verify
pnpm add tailwindcss postcss autoprefixer @radix-ui/react-dialog @radix-ui/react-slot
pnpm add class-variance-authority clsx tailwind-merge lucide-react
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card badge skeleton
```

## 5.2 Layout

### Verification App Shell

```
┌────────────────────────────────────────────────┐
│  🇿🇦 RSA │ Official Cannabis Tracking System  │  ← Simplified GovMasthead
├────────────────────────────────────────────────┤
│                                                │
│              [Page Content]                    │
│                                                │
├────────────────────────────────────────────────┤
│  © 2025 Republic of South Africa │ Privacy     │  ← Minimal GovFooter
└────────────────────────────────────────────────┘
```

- No sidebar, no navigation menu
- Government masthead (simplified: no system name abbreviation, just RSA branding)
- Content centered, max-width 640px
- Minimal footer: copyright + privacy link + accessibility link

### Color Theme (Verify-specific)

Uses the same design system tokens but with Tailwind config:

```typescript
// apps/verify/tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B3A5C',
          50: '#E8EDF3',
          // ... full primary scale
        },
        secondary: {
          DEFAULT: '#007A4D',
          // ... full secondary scale
        },
        accent: {
          DEFAULT: '#FFB81C',
          text: '#996E00', // WCAG-safe
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
};
```

## 5.3 Home Page (`/`)

**File:** `apps/verify/src/pages/HomePage.tsx`
**Current state:** Basic search input.

### Redesign Specification

```
┌────────────────────────────────────────────────┐
│                                                │
│         [NCTS Shield Logo - large]             │
│                                                │
│     Verify Cannabis Product                    │
│     Authenticity                               │
│                                                │
│  Scan a QR code or enter a tracking ID to      │
│  verify the authenticity and compliance of      │
│  cannabis products in South Africa.             │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔍 Enter Tracking ID (e.g., PLT-XXXX)  │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│         [Verify Product →]                     │
│                                                │
│   ── OR ──                                     │
│                                                │
│      [ 📷 Scan QR Code ]                      │
│                                                │
│                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 🔒 Secure│ │ 📋 Official││ ✅ Real-time│   │
│  │ Government│ │ SAHPRA    │ │ Tracking  │    │
│  │ Verified  │ │ Compliant │ │ Data      │    │
│  └──────────┘ └──────────┘ └──────────┘      │
│                                                │
└────────────────────────────────────────────────┘
```

### Functional Specifications

**Search Input:**
- Large input field (44px height)
- Accepts tracking ID formats: `PLT-YYYYMMDD-XXX`, `TRF-YYYYMMDD-XXX`, `SAL-YYYYMMDD-XXX`
- Input validation regex on blur
- Error message: "Invalid tracking ID format. Expected: PLT-20250106-ABC"
- Submit on Enter key

**QR Scanner:**
- Opens device camera (rear-facing preferred)
- Uses `@ncts/qr-lib` for decoding
- Overlay: square scan area with corners highlighted
- Auto-detect and decode
- Haptic feedback on successful scan (where supported)
- Fallback: "Camera not available — enter tracking ID manually"
- Permission request with clear explanation: "Camera access is needed to scan the QR code on the product"

**Trust Badges:**
- 3 small info boxes below the fold
- Each: icon + heading + one-line description
- Responsive: 3-across on desktop, stacked on mobile

### Performance Requirements
- SSR or pre-rendered HTML for instant first paint
- Search input visible without JS (progressive enhancement)
- Total page weight < 150KB (including fonts)
- Works with JavaScript disabled (form submits to server)

## 5.4 Verification Result Page (`/verify/:trackingId`)

**File:** `apps/verify/src/pages/VerifyPage.tsx`
**Current state:** Basic verification display.

### Redesign Specification

#### Verified (Pass) Result

```
┌─────────────────────────────────────────────┐
│                                             │
│          ✅  VERIFIED                      │
│                                             │
│  This product has been verified by the      │
│  National Cannabis Tracking System.         │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Tracking ID: PLT-20250106-ABC      │    │
│  │  Product:     Purple Haze (Indica)  │    │
│  │  Operator:    GreenFields Cannabis  │    │
│  │  Facility:    Western Cape Farm     │    │
│  │  Harvest:     2025-01-06            │    │
│  │  Lab Tested:  ✅ Passed             │    │
│  │  THC:         18.5%  CBD: 0.8%      │    │
│  │  Permit:      PRM-20250106-XYZ ●Act │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  SUPPLY CHAIN JOURNEY               │    │
│  │                                     │    │
│  │  🌱 Cultivated → 🧪 Lab Tested →  │    │
│  │  📦 Transferred → 🛒 Sold          │    │
│  │                                     │    │
│  │  Full chain verified with no gaps   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Verified at: 2025-01-07 14:30 SAST        │
│  Verification ID: VRF-20250107-ABC          │
│                                             │
│  [Verify Another Product]                   │
│                                             │
└─────────────────────────────────────────────┘
```

#### Unverified (Fail) Result

```
┌─────────────────────────────────────────────┐
│                                             │
│          ❌  NOT VERIFIED                   │
│                                             │
│  This tracking ID could not be verified.    │
│  This product may be counterfeit or         │
│  unregistered.                              │
│                                             │
│  ⚠ Do not consume unverified cannabis      │
│    products.                                │
│                                             │
│  What to do:                                │
│  • Contact the seller for verification      │
│  • Report suspicious products to SAHPRA     │
│  • Call: 0800-NCTS (6287)                  │
│                                             │
│  [Report Suspicious Product]                │
│  [Verify Another Product]                   │
│                                             │
└─────────────────────────────────────────────┘
```

#### Loading State

```
┌─────────────────────────────────────────────┐
│                                             │
│          🔍  Verifying...                  │
│                                             │
│   ████████████░░░░░░░░░░░░░  Checking       │
│                                             │
│   Tracking ID: PLT-20250106-ABC             │
│                                             │
│   Verifying product authenticity with the   │
│   national database...                      │
│                                             │
└─────────────────────────────────────────────┘
```

#### Product Details Shown (Verified)

| Field | Source | Display |
|---|---|---|
| Tracking ID | `plant.trackingId` | Monospace, copyable |
| Product/Strain | `plant.strain` + type tag | Text + badge |
| Operator | `operator.name` | Text (no link — public page) |
| Facility | `facility.name` + province | Text |
| Harvest Date | `harvest.date` | Formatted date |
| Lab Status | `labResult.status` | Passed ✅ / Failed ❌ / Pending ⏳ |
| THC/CBD | `labResult.thcPercent` / `labResult.cbdPercent` | Percentage |
| Permit Status | `operator.permitStatus` | Active ✅ / Expired ⚠ |
| Supply Chain | Lifecycle stages with dates | Simplified stepper |

#### Security
- Rate limit: 10 verifications per IP per minute
- CAPTCHA after 5 verifications in a row (hCaptcha — POPIA appropriate)
- No sensitive operator data exposed (no contact details, financial info)
- Verification creates audit log entry

## 5.5 QR Scanner Page (`/scan`)

Dedicated full-screen QR scanner page (accessed from button on home page or directly by URL):

### Layout

```
┌────────────────────────────────────────┐
│  ← Back to Home            [Torch 🔦] │
│                                        │
│  Point your camera at the              │
│  QR code on the product                │
│                                        │
│  ┌────────────────────────────────┐    │
│  │                                │    │
│  │    ┌──────────────────┐       │    │
│  │    │                  │       │    │
│  │    │   [Camera View]  │       │    │
│  │    │                  │       │    │
│  │    └──────────────────┘       │    │
│  │     Scanning area overlay     │    │
│  │                                │    │
│  └────────────────────────────────┘    │
│                                        │
│  Or enter ID manually:                 │
│  ┌────────────────────────────────┐    │
│  │  PLT-                          │    │
│  └────────────────────────────────┘    │
│                                        │
└────────────────────────────────────────┘
```

### Features
- Rear camera prioritized, switch camera button available
- Torch/flashlight toggle for dark environments
- Scan area overlay with animated corners
- Successful scan: brief green flash + haptic → redirect to verify page
- Error: "QR code not recognized. Try again or enter ID manually."
- Camera permission denied: graceful fallback to manual entry

---

# Section 6: Advanced Features

## 6.1 Real-Time Updates

### WebSocket Integration

```tsx
// packages/api-client/src/hooks/useRealtimeUpdates.ts
interface RealtimeEvent {
  type: 'transfer.received' | 'compliance.alert' | 'plant.stage_changed' | 'permit.status_changed';
  entityId: string;
  data: Record<string, any>;
  timestamp: string;
}

const useRealtimeUpdates = (options: {
  entityTypes?: string[];
  onEvent: (event: RealtimeEvent) => void;
}) => {
  // Connect to WebSocket endpoint
  // Reconnect with exponential backoff
  // Fallback to polling if WebSocket unavailable
};
```

### Event Handling

| Event | Operator Portal Response | Admin Dashboard Response |
|---|---|---|
| `transfer.received` | Notification + badge increment | Activity feed update |
| `compliance.alert` | Notification (if operator matched) | Alert count increment + notification |
| `plant.stage_changed` | Dashboard stat update | — |
| `permit.status_changed` | Notification | Table refresh |

### Fallback: Long Polling
- If WebSocket connection fails 3 times, fallback to polling every 30 seconds
- Show `DataFreshness` component indicating poll mode

## 6.2 Offline Support (Service Worker)

### Strategy

```
┌─────────────────────────────────────────────┐
│  Online                                      │
│  ├── All API calls go direct                │
│  ├── Responses cached in IndexedDB          │
│  └── Assets cached via Service Worker        │
│                                              │
│  Offline                                     │
│  ├── Read from IndexedDB cache              │
│  ├── Writes queued to sync queue            │
│  ├── OfflineBanner shown                    │
│  └── SyncStatus shows pending count         │
│                                              │
│  Back Online                                 │
│  ├── Sync queue processed (FIFO)            │
│  ├── Conflict resolution: server wins       │
│  ├── SyncStatus shows "syncing" then "done" │
│  └── OfflineBanner dismissed                │
└─────────────────────────────────────────────┘
```

### Cached Data (Operator Portal)

| Data | Strategy | TTL |
|---|---|---|
| Facility list | Cache-first, revalidate | 1 hour |
| Plant registry | Network-first, cache fallback | 5 min |
| Transfer history | Network-first, cache fallback | 5 min |
| User profile | Cache-first, revalidate | 1 day |
| Static assets (JS/CSS/fonts) | Cache-first | Until version change |
| Map tiles | Cache-first (limited area) | 1 week |

### Offline Write Queue

Actions that can be performed offline:
1. Register a new plant (queued)
2. Update plant stage (queued)
3. Record harvest weights (queued)
4. Draft a transfer (queued — not submitted until online)

Not available offline:
- Submit transfers (requires real-time verification)
- View lab results (requires network)
- Generate reports

### Service Worker Registration

```typescript
// apps/web/src/sw-register.ts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        // Show "New version available — refresh to update" banner
      });
    });
  });
}
```

## 6.3 Data Export & Printing

### CSV Export

All `ProTable` instances include `CsvExportButton` in toolbar.

Column config for CSV export differs from display:
- Tracking IDs: full string (no component rendering)
- Dates: ISO 8601 format
- Status: text enum value
- Computed columns: include computed values

### PDF Reports

Use `@react-pdf/renderer` for formatted PDF generation:

- **Plant Certificate**: Single plant tracking record with QR code
- **Transfer Manifest**: Official transfer document with all items
- **Compliance Report**: Operator compliance summary with charts
- **Monthly Statement**: Monthly activity summary

### Print Stylesheets

Global print styles (see Section 2.20). Each printable page includes:
- NCTS header with coat of arms
- Date/time of printing
- Page numbers
- "Printed from NCTS — Official Record" watermark

## 6.4 Global Search Architecture

`SearchGlobal` component (Section 2.21) connects to:

### Search API

```
GET /api/v1/search?q={query}&types={entity_types}&limit=20
```

Response grouped by entity type. Frontend displays in categorized sections.

### Search Indexing

| Entity | Indexed Fields | Weight |
|---|---|---|
| Plants | trackingId, strain, facilityName | trackingId: 10, strain: 5, facilityName: 3 |
| Facilities | name, province, city, operatorName | name: 10, province: 5 |
| Operators | name, registrationNumber, province | name: 10, regNumber: 8 |
| Transfers | trackingId, fromFacility, toFacility | trackingId: 10 |
| Permits | permitNumber, operatorName, type | permitNumber: 10, operator: 5 |
| Sales | trackingId, buyerName | trackingId: 10 |

### Recent Searches

Stored in `localStorage` under `ncts-recent-searches`:
```json
[
  { "query": "PLT-20250106", "timestamp": "2025-01-07T14:30:00Z", "resultType": "plant" },
  { "query": "GreenFields", "timestamp": "2025-01-07T14:25:00Z", "resultType": "facility" }
]
```
Maximum 10 entries, FIFO eviction.

## 6.5 Notification System Architecture

### In-App Notifications

Notification bell in header → dropdown panel:

```
┌────────────────────────────────────┐
│  Notifications (5 new)    Mark all │
├────────────────────────────────────┤
│  🔴 Compliance violation detected  │
│     PLT-20250106-ABC, 2 hours ago │
│  🟡 Permit PRM-XYZ expires in 28d │
│     Yesterday                      │
│  🔵 Transfer TRF-123 received     │
│     3 hours ago                    │
│  🔵 Lab results ready for HRV-456 │
│     5 hours ago                    │
│  ⚪ Monthly report generated       │
│     Yesterday                      │
├────────────────────────────────────┤
│  View all notifications →          │
└────────────────────────────────────┘
```

### Notification Preferences (per user)

| Event | In-App | Email | SMS |
|---|---|---|---|
| Transfer received | ✅ Always | ☑ Default on | ☐ Opt-in |
| Compliance alert | ✅ Always | ✅ Always | ☑ Default on |
| Permit expiring | ✅ Always | ☑ Default on | ☐ Opt-in |
| Lab results ready | ✅ Always | ☑ Default on | ☐ Off |
| Monthly report | ✅ Always | ☑ Default on | ☐ Off |
| System maintenance | ✅ Always | ✅ Always | ☐ Off |

### Push Notifications (Future)

- Web Push API for browser notifications when app is in background
- Requires user opt-in
- Service Worker handles push events
- Notification click → open app at relevant page

---

# Section 7: Mobile & Tablet Optimization

## 7.1 Target Devices

### Primary (Must fully support)

| Device | Screen | RAM | OS | Market Share |
|---|---|---|---|---|
| Samsung Galaxy A15 | 6.5" 1080×2340 | 4GB | Android 14 | High (budget flagship) |
| Samsung Galaxy A05 | 6.7" 720×1600 | 4GB | Android 13 | High (entry-level) |
| Samsung Galaxy A03 | 6.5" 720×1600 | 3GB | Android 12 | Moderate (legacy) |
| iPhone SE (3rd gen) | 4.7" 750×1334 | 4GB | iOS 16+ | Moderate |

### Secondary (Should support)

| Device | Notes |
|---|---|
| iPad (10th gen) | Tablet layout optimization |
| Huawei Y-series | Popular in SA, HMS (no Google services) |
| Feature phones | Not targeted, verify app only — progressive enhancement |

## 7.2 Mobile-Specific Patterns

### Bottom Navigation Bar

See Section 1.5 for full specification. Key mobile overrides:

| Aspect | Desktop | Mobile |
|---|---|---|
| Navigation | Sidebar (ProLayout) | Bottom tab bar (56px) |
| Breadcrumbs | Full path | Back button + page title |
| Page title | PageContainer heading | AppBar title (centered) |
| Actions | Buttons in PageContainer extra | FAB or overflow menu |
| Tables | Full ProTable | Card list or swipeable |
| Filters | Inline filter bar | Bottom sheet filter panel |
| Modals | Centered modal | Full-screen drawer |
| Date picker | Calendar popup | Native date input |

### Mobile AppBar

```
┌──────────────────────────────────────┐
│  ← │       Plant Details      │ ⋯  │
└──────────────────────────────────────┘
```
- Height: 56px
- Back arrow (left): navigates back
- Title (center): current page name
- Overflow menu (right): page-level actions

### Data Table → Card List Transformation

Tables automatically transform to card lists on mobile:

```
ProTable (desktop):
┌────┬──────────┬────────┬──────┐
│ ID │ Strain   │ Stage  │ Fac  │
├────┼──────────┼────────┼──────┤
│ PLT│ Purple H │ 🌿 Veg│ Farm │
│ PLT│ Blue Dr  │ 🌸 Flw│ Farm │
└────┴──────────┴────────┴──────┘

Card List (mobile):
┌──────────────────────────────┐
│ PLT-20250106-ABC     🌿 Veg │
│ Purple Haze                  │
│ Western Cape Farm            │
│ 45 days ago           [→]   │
└──────────────────────────────┘
┌──────────────────────────────┐
│ PLT-20250106-DEF     🌸 Flw │
│ Blue Dream                   │
│ Western Cape Farm            │
│ 12 days ago           [→]   │
└──────────────────────────────┘
```

**Implementation decision:** Use a custom `useBreakpoint()` hook (from `packages/ui/src/hooks/useBreakpoint.ts`) that detects `< md` breakpoint and conditionally renders a `List` of `Card` components instead of `ProTable`. This approach is preferred over ProTable's built-in `cardList` mode because:
- It provides full control over the mobile card layout (custom field ordering, truncation, actions)
- It avoids ProTable's `cardList` limitations (no custom card template, limited styling)
- The `useBreakpoint()` hook is already used elsewhere for responsive layout decisions
- The same pattern applies consistently across all entity tables (plants, transfers, sales, etc.)

### Bottom Sheet Filters

When filter button tapped on mobile:
- Slide-up sheet from bottom (max 80% viewport height)
- Drag handle at top for swipe-to-dismiss
- Filter fields stacked vertically
- "Apply Filters" sticky button at bottom
- "Clear All" text button
- Count badge on filter button when filters active

### Floating Action Button (FAB)

Primary creation action on each page:

| Page | FAB Icon | Action |
|---|---|---|
| Plants | Plus + Sprout | Register Plant |
| Harvests | Plus + Wheat | Record Harvest |
| Transfers | Plus + Truck | Create Transfer |
| Sales | Plus + ShoppingCart | Record Sale |

- Position: bottom-right, 16px from edge, above bottom nav
- Size: 56×56px
- Color: Primary-500
- Shadow: shadow-lg
- Expandable: long-press → speed dial with secondary actions

### Touch Targets

All touch targets minimum **44×44px** (WCAG 2.5.5 AAA).

| Element | Minimum Touch Target |
|---|---|
| Buttons | 44×44px |
| Table row (clickable) | 48px row height |
| Checkbox/Radio | 44×44px hit area |
| Links (inline) | 44px line height |
| Bottom nav tabs | 48×48px |
| Close button (modals) | 44×44px |

### Swipe Gestures

| Gesture | Context | Action |
|---|---|---|
| Swipe left on card | Plant/transfer card | Quick actions (view, edit) |
| Swipe down on list | Any list view | Pull-to-refresh |
| Swipe down on sheet | Bottom sheet | Dismiss |
| Horizontal scroll | Filter chips | Browse filters |

## 7.3 Tablet Layout (768px — 1199px)

### Split-View Pattern

On tablets in landscape:
- Left panel (40%): list view
- Right panel (60%): detail view
- Selecting item in list shows detail in right panel
- Both panels scrollable independently

### Dashboard Grid

| Device | Stat cards | Chart columns |
|---|---|---|
| Desktop | 4 across | 2 side-by-side |
| Tablet landscape | 4 across | 2 side-by-side |
| Tablet portrait | 2 across | 1 stacked |
| Phone | 1 (horizontal scroll) | 1 stacked |

## 7.4 Performance Budget (Mobile)

| Metric | Target | Measurement |
|---|---|---|
| First Contentful Paint | <2.0s on 4G | Lighthouse |
| Largest Contentful Paint | <3.0s on 4G | Lighthouse |
| Time to Interactive | <4.0s on 4G | Lighthouse |
| Total Blocking Time | <200ms | Lighthouse |
| Cumulative Layout Shift | <0.1 | Lighthouse |
| JS Bundle (main) | <200KB gzipped | Webpack analyzer |
| CSS Bundle | <50KB gzipped | After purge |
| Font files | <100KB total | woff2 subset |
| Initial HTML | <14KB | Server response |

### Optimization Strategies

1. **Code Splitting**: Lazy load routes via `React.lazy()` + `Suspense`
2. **Font Subsetting**: Latin + basic diacritics only (covers all 11 SA languages)
3. **Image Optimization**: WebP with JPEG fallback, lazy loading via `loading="lazy"`
4. **Virtualized Lists**: Use `react-window` for lists >100 items
5. **Debounced Inputs**: 300ms debounce on search, 500ms on filters
6. **Memoization**: `React.memo` on StatCard, StatusBadge, TrackingId
7. **Prefetch**: Prefetch likely next routes on link hover (`<link rel="prefetch">`)
8. **Bundle Analysis**: Regular `rollup-plugin-visualizer` checks against budget

## 7.5 Data Cost Awareness

In South Africa, mobile data is expensive relative to income. Strategies:

1. **Compress API responses**: gzip/brotli at API gateway
2. **Pagination**: Never load full datasets. Default 20 items per page.
3. **Image thumbnails**: Serve 200px thumbnails in lists, full-size in detail
4. **Lazy-load charts**: Only load chart libraries when charts scroll into view
5. **Cache aggressively**: Service Worker caches all static assets
6. **Data usage indicator** (future): "This session: ~2.3 MB used" in settings

---

# Section 8: Accessibility & Internationalization

## 8.1 WCAG 2.1 AA Compliance Checklist

### Perceivable

| Criterion | Requirement | Implementation |
|---|---|---|
| 1.1.1 Non-text Content | All images have alt text | `alt` on all `<img>`, `aria-label` on icon buttons |
| 1.3.1 Info and Relationships | Semantic HTML structure | Use `<main>`, `<nav>`, `<header>`, `<footer>`, `<section>`, `<article>` |
| 1.3.2 Meaningful Sequence | Logical reading order | DOM order matches visual order |
| 1.3.3 Sensory Characteristics | Don't rely on color alone | StatusBadge always has text label + optional icon |
| 1.4.1 Use of Color | Color not sole indicator | ✅ Status badges use text + color + icon |
| 1.4.3 Contrast (Minimum) | 4.5:1 text, 3:1 large | ✅ All colors validated (see contrast matrix) |
| 1.4.4 Resize Text | Usable at 200% zoom | Use relative units (`rem`, `em`), test at 200% |
| 1.4.10 Reflow | No horizontal scroll at 320px | Responsive design, no fixed widths |
| 1.4.11 Non-text Contrast | 3:1 for UI controls | Input borders, button borders meet 3:1 |
| 1.4.13 Content on Hover | Hover content dismissible | Tooltips: Esc to dismiss, persistent on hover |

### Operable

| Criterion | Requirement | Implementation |
|---|---|---|
| 2.1.1 Keyboard | All functions via keyboard | Tab navigation, Enter/Space to activate, Esc to dismiss |
| 2.1.2 No Keyboard Trap | Can always Tab out | Test all modals, drawers, dropdowns |
| 2.4.1 Bypass Blocks | Skip navigation link | "Skip to main content" in GovMasthead |
| 2.4.2 Page Titled | Descriptive `<title>` | `{Page Name} — NCTS` format via `useDocumentTitle()` hook |
| 2.4.3 Focus Order | Logical focus sequence | Tab order: masthead skip-link → header → sidebar → content |
| 2.4.6 Headings and Labels | Descriptive headings | H1 per page, logical heading hierarchy (H1→H2→H3) |
| 2.4.7 Focus Visible | Clear focus indicator | 3px solid outline, 2px offset, primary-500 color |
| 2.5.5 Target Size | 44×44px minimum | All interactive elements (see Section 7.2) |

### Understandable

| Criterion | Requirement | Implementation |
|---|---|---|
| 3.1.1 Language of Page | `lang` attribute | `<html lang="en-ZA">` |
| 3.1.2 Language of Parts | Parts in other language | `lang` attribute on any non-English text blocks |
| 3.2.1 On Focus | No context change on focus | No auto-navigation on focus |
| 3.2.2 On Input | No unexpected changes | Form submission only on explicit button click |
| 3.3.1 Error Identification | Errors clearly identified | Red border + inline error text below field |
| 3.3.2 Labels or Instructions | Form fields labeled | All inputs have visible `<label>` elements |
| 3.3.3 Error Suggestion | Suggest correction | "Invalid date format. Try: YYYY-MM-DD" |
| 3.3.4 Error Prevention (Legal) | Confirm destructive actions | Confirmation modal for delete, suspend, revoke |

### Robust

| Criterion | Requirement | Implementation |
|---|---|---|
| 4.1.1 Parsing | Valid HTML | Linted via eslint-plugin-jsx-a11y |
| 4.1.2 Name, Role, Value | ARIA attributes | All custom components have appropriate ARIA |
| 4.1.3 Status Messages | Screen reader announcements | `aria-live` regions for toasts, form errors, sync status |

## 8.2 Focus Management

### Focus Indicator Style

```css
/* Global focus style */
:focus-visible {
  outline: 3px solid #1B3A5C;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove default outline (replaced by focus-visible) */
:focus:not(:focus-visible) {
  outline: none;
}

/* High contrast mode focus */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid LinkText;
  }
}
```

### Focus Trapping

Modals and drawers trap focus inside:
- Tab cycles through focusable elements within the modal
- Shift+Tab cycles backwards
- Esc closes the modal
- Focus restores to the trigger element after close

### Route Change Announcements

```tsx
// packages/ui/src/hooks/useRouteAnnouncement.ts
const useRouteAnnouncement = () => {
  const location = useLocation();
  
  useEffect(() => {
    const pageTitle = document.title;
    // Announce to screen readers
    const announcer = document.getElementById('route-announcer');
    if (announcer) {
      announcer.textContent = `Navigated to ${pageTitle}`;
    }
  }, [location.pathname]);
};

// In App root:
<div id="route-announcer" role="status" aria-live="assertive" aria-atomic="true" className="sr-only" />
```

## 8.3 Screen Reader Testing Matrix

| Screen Reader | Browser | OS | Priority |
|---|---|---|---|
| NVDA | Chrome / Firefox | Windows | Primary |
| JAWS | Chrome | Windows | Primary |
| VoiceOver | Safari | macOS / iOS | Secondary |
| TalkBack | Chrome | Android | Secondary |

### Test Scenarios

1. Navigate entire app using only keyboard (Tab, Enter, Space, Esc, Arrow keys)
2. Read dashboard KPIs with screen reader — verify values and trends are announced
3. Navigate ProTable with screen reader — verify column headers, cell values, sorting
4. Complete plant registration wizard (all 4 steps) with screen reader
5. Navigate and filter tables using keyboard only
6. Verify all toast messages are announced
7. Verify modal focus trapping and restoration
8. Run QR scanner error flow with screen reader (camera permission denied)

## 8.4 Internationalization (i18n) Architecture

### Setup

```bash
pnpm add i18next react-i18next i18next-browser-languagedetector
```

### Configuration

```typescript
// packages/ui/src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      // Future: af, zu, xh, st, tn, ss, ve, ts, nso, nr
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ncts-language',
    },
  });
```

### Translation Key Structure

```json
// packages/ui/src/i18n/locales/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "view": "View",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "print": "Print",
    "loading": "Loading...",
    "noResults": "No results found",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "submit": "Submit"
  },
  "nav": {
    "dashboard": "Dashboard",
    "plants": "Plant Management",
    "facilities": "Facilities",
    "harvests": "Harvests",
    "labResults": "Lab Results",
    "transfers": "Transfers",
    "sales": "Sales",
    "compliance": "Compliance",
    "permits": "Permits & Licenses",
    "operators": "Operators",
    "reports": "Reports",
    "audit": "Audit Log",
    "settings": "Settings"
  },
  "dashboard": {
    "title": "Dashboard",
    "activePlants": "Active Plants",
    "pendingTransfers": "Pending Transfers",
    "monthlySales": "Monthly Sales",
    "complianceScore": "Compliance Score",
    "recentActivity": "Recent Activity",
    "quickActions": "Quick Actions"
  },
  "plants": {
    "title": "Plant Management",
    "register": "Register Plant",
    "trackingId": "Tracking ID",
    "strain": "Strain",
    "stage": "Stage",
    "facility": "Facility",
    "plantedDate": "Planted Date",
    "stages": {
      "seed": "Seed",
      "seedling": "Seedling",
      "vegetative": "Vegetative",
      "flowering": "Flowering",
      "harvested": "Harvested",
      "destroyed": "Destroyed"
    },
    "emptyState": {
      "title": "No plants registered",
      "description": "Register your first plant to begin tracking its lifecycle."
    }
  },
  "transfers": {
    "title": "Transfers",
    "create": "Create Transfer",
    "incoming": "Incoming",
    "outgoing": "Outgoing",
    "statuses": {
      "draft": "Draft",
      "initiated": "Initiated",
      "dispatched": "Dispatched",
      "inTransit": "In Transit",
      "received": "Received",
      "verified": "Verified",
      "rejected": "Rejected",
      "cancelled": "Cancelled"
    }
  },
  "verify": {
    "title": "Verify Cannabis Product",
    "subtitle": "Scan a QR code or enter a tracking ID to verify product authenticity.",
    "inputPlaceholder": "Enter Tracking ID (e.g., PLT-20250106-ABC)",
    "verifyButton": "Verify Product",
    "scanQr": "Scan QR Code",
    "verified": "VERIFIED",
    "verifiedMessage": "This product has been verified by the National Cannabis Tracking System.",
    "notVerified": "NOT VERIFIED",
    "notVerifiedMessage": "This tracking ID could not be verified. This product may be counterfeit or unregistered."
  },
  "masthead": {
    "governmentName": "Republic of South Africa",
    "systemName": "Official Cannabis Tracking System"
  },
  "footer": {
    "about": "About NCTS",
    "legal": "Legal",
    "contact": "Contact",
    "copyright": "© {{year}} Republic of South Africa. Department of Health. All rights reserved.",
    "popiaNotice": "POPIA Notice",
    "paiaManual": "PAIA Manual",
    "termsOfUse": "Terms of Use",
    "accessibility": "Accessibility",
    "cookiePolicy": "Cookie Policy"
  },
  "errors": {
    "notFound": "Page Not Found",
    "notFoundMessage": "The page you're looking for doesn't exist or has been moved.",
    "serverError": "Something Went Wrong",
    "serverErrorMessage": "We're experiencing technical difficulties. Please try again.",
    "networkError": "Unable to load data. Check your connection and try again.",
    "permissionDenied": "You don't have permission to access this page.",
    "sessionExpired": "Your session has expired. Redirecting to login..."
  },
  "offline": {
    "banner": "You're offline — changes will sync when reconnected",
    "pendingChanges": "{{count}} pending changes"
  }
}
```

### Translation Usage Pattern

```tsx
import { useTranslation } from 'react-i18next';

const PlantsPage = () => {
  const { t } = useTranslation();
  
  return (
    <PageContainer title={t('plants.title')}>
      <ProTable
        headerTitle={t('plants.title')}
        columns={[
          { title: t('plants.trackingId'), dataIndex: 'trackingId' },
          { title: t('plants.strain'), dataIndex: 'strain' },
          { title: t('plants.stage'), dataIndex: 'currentStage' },
        ]}
      />
    </PageContainer>
  );
};
```

### Number & Date Formatting

```typescript
// packages/ui/src/i18n/formatters.ts
export const formatNumber = (value: number, locale = 'en-ZA') =>
  new Intl.NumberFormat(locale).format(value);

export const formatCurrency = (value: number, locale = 'en-ZA') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'ZAR' }).format(value);

export const formatDate = (date: Date | string, locale = 'en-ZA') =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(date));

export const formatDateTime = (date: Date | string, locale = 'en-ZA') =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));

export const formatRelativeTime = (date: Date | string, locale = 'en-ZA') => {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diff = Date.now() - new Date(date).getTime();
  // Calculate appropriate unit (minutes, hours, days)
  // Return formatted relative time
};
```

### RTL Support (Future)

While no SA official languages require RTL, the architecture should support it:
- Use logical CSS properties (`margin-inline-start` vs `margin-left`)
- Use `dir="ltr"` on `<html>` (explicit)
- Ant Design 5 has built-in RTL support via `ConfigProvider direction="rtl"`

## 8.5 POPIA Compliance (Frontend)

### Cookie Consent Banner

```
┌────────────────────────────────────────────────────────────────┐
│  🍪 This system uses essential cookies for authentication      │
│  and security. No tracking cookies are used.                   │
│                                                                │
│  [Accept Essential Cookies]  [Privacy Policy]                  │
└────────────────────────────────────────────────────────────────┘
```

- Only essential cookies (auth token, session, language preference)
- No analytics cookies without consent
- No third-party tracking
- Banner appears once, dismiss stored in localStorage
- POPIA notice link in footer

### Data Minimization

- Forms only collect required data
- Optional fields clearly marked
- No fingerprinting or device tracking
- GPS collected only on explicit user action + explanation

### Right to Access / Portability

- Settings page: "Export My Data" button
- Generates ZIP with all operator's data in JSON + CSV formats
- Includes: profile, facilities, plants, transfers, sales, audit trail
- Processing time: shown as background job with email notification

### Consent Records

```typescript
interface ConsentRecord {
  type: 'terms' | 'privacy' | 'cookies' | 'data_processing';
  consented: boolean;
  timestamp: string;
  version: string;       // Version of the policy consented to
  ipAddress?: string;     // Masked for storage
}
```

All consent interactions recorded and auditable.

---

# Section 9: Authentication & Session Pages

All three NCTS applications share a common authentication flow. The operator portal (`apps/web/`) and government dashboard (`apps/admin/`) use the same auth patterns; the public verification app (`apps/verify/`) has no authentication.

The unified portal (`apps/portal/`) already contains `LoginPage.tsx` and an `AuthContext` with `useAuth()` hook. The specifications below define the full auth experience.

## 9.1 Login Page (`/login`)

**File:** `apps/portal/src/pages/LoginPage.tsx` (exists, needs redesign)

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  [GovMasthead — full width]                              │
│  [PhaseBanner — "BETA"]                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│              ┌──────────────────────┐                    │
│              │  [RSA Coat of Arms]  │                    │
│              │                      │                    │
│              │  National Cannabis   │                    │
│              │  Tracking System     │                    │
│              │                      │                    │
│              │  ┌────────────────┐  │                    │
│              │  │ Email          │  │                    │
│              │  └────────────────┘  │                    │
│              │  ┌────────────────┐  │                    │
│              │  │ Password   👁  │  │                    │
│              │  └────────────────┘  │                    │
│              │                      │                    │
│              │  ☐ Remember me       │                    │
│              │                      │                    │
│              │  [    Sign In     ]  │                    │
│              │                      │                    │
│              │  Forgot password?    │                    │
│              │                      │                    │
│              └──────────────────────┘                    │
│                                                          │
│  © 2025 Republic of South Africa                         │
│  [Privacy Policy] [Terms] [Accessibility]                │
├──────────────────────────────────────────────────────────┤
│  [GovFooter]                                             │
└──────────────────────────────────────────────────────────┘
```

### Specifications

| Element | Detail |
|---|---|
| Background | Light grey `neutral-50` with subtle topographic SA map watermark (opacity 0.03) |
| Card | `Card` component, max-width 420px, centered, `box-shadow: elevation-2` |
| Logo | RSA Coat of Arms (48×48) + "National Cannabis Tracking System" in `heading-4` |
| Email field | `Input` with `prefix={<MailOutlined />}`, type="email", auto-focus |
| Password field | `Input.Password` with visibility toggle |
| Remember me | `Checkbox`, stores preference in localStorage, extends session from 1hr → 7 days |
| Sign In button | `Button type="primary" block size="large"`, full width, `primary-500` bg |
| Forgot password | `Typography.Link`, navigates to `/forgot-password` |
| Footer links | Privacy Policy, Terms of Use, Accessibility Statement — all open new tab |
| Branding | Full `GovMasthead` top, `GovFooter` bottom — establishes government authority |

### Validation

| Field | Rule | Error Message |
|---|---|---|
| Email | Required, valid email format | "Please enter a valid email address" |
| Password | Required, min 8 chars | "Password is required" |

### Error States

| Scenario | Behaviour |
|---|---|
| Invalid credentials | `Alert type="error"`: "Invalid email or password. Please try again." — no indication of which field is wrong (security) |
| Account locked | `Alert type="warning"`: "Account locked due to too many attempts. Please try again in 15 minutes or contact support." |
| Server error | `Alert type="error"`: "Unable to connect. Please check your internet connection and try again." |
| Session expired redirect | `Alert type="info"`: "Your session has expired. Please sign in again." (shown when redirected from protected route) |

### Accessibility

- Tab order: Email → Password → Remember me → Sign In → Forgot password
- `aria-label` on all inputs
- Error messages use `aria-live="polite"` and are associated via `aria-describedby`
- High contrast mode: card border becomes visible, button has 2px outline
- Screen reader announcement on form submission result

## 9.2 Multi-Factor Authentication Page (`/login/mfa`)

Shown after successful email/password when MFA is enabled (required for all government admin accounts, optional for operators).

### Layout

```
┌──────────────────────────┐
│  [RSA Coat of Arms]      │
│  Verification Required   │
│                          │
│  Enter the 6-digit code  │
│  from your               │
│  authenticator app        │
│                          │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐│
│  │  ││  ││  ││  ││  ││  ││
│  └──┘└──┘└──┘└──┘└──┘└──┘│
│                          │
│  [     Verify Code     ] │
│                          │
│  Can't access your app?  │
│  Use a recovery code     │
│                          │
│  ← Back to sign in       │
└──────────────────────────┘
```

### Specifications

| Element | Detail |
|---|---|
| Code input | 6 separate `Input` fields, auto-advance on digit entry, paste support for full 6-digit code |
| Auto-submit | Submits automatically when all 6 digits entered |
| Timer | 30-second countdown showing when current TOTP code expires |
| Recovery link | Navigates to recovery code entry form |
| Back link | Returns to login, clears partial auth state |
| Invalid code | Shake animation + "Invalid code. Please try again." (3 attempts, then lockout) |

### Recovery Code Entry

Fallback form with single `Input.TextArea` for recovery code (16 chars alphanumeric). Shows remaining recovery codes count after successful use.

## 9.3 Forgot Password Page (`/forgot-password`)

### Flow

1. **Email entry** — User enters email, system sends reset link
2. **Confirmation** — "If an account exists with that email, a password reset link has been sent" (no account disclosure)
3. **Reset form** — `/reset-password?token=xxx` — New password + confirm, with strength meter

### Reset Password Form

| Field | Validation |
|---|---|
| New Password | Min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char. Real-time strength meter (`zxcvbn` library) |
| Confirm Password | Must match |

**Strength meter:** Uses `Progress` component with color: red (weak) → orange (fair) → green (strong). Textual feedback below: "Weak", "Fair", "Strong", "Very Strong".

**Success:** Redirect to `/login` with success `Alert`: "Password reset successfully. Please sign in with your new password."

## 9.4 Session Management

### Session Expiry Modal

When JWT token is within 5 minutes of expiry, show a `Modal`:

```
┌──────────────────────────────────┐
│  Session Expiring Soon     [×]   │
│                                  │
│  Your session will expire in     │
│  4:32                            │
│                                  │
│  Any unsaved changes will be     │
│  lost if you don't extend.       │
│                                  │
│  [Extend Session] [Sign Out]     │
└──────────────────────────────────┘
```

| Behaviour | Detail |
|---|---|
| Timer | Countdown in `mm:ss`, updates every second |
| Extend | Calls token refresh endpoint, resets session |
| Sign Out | Clears tokens, redirects to `/login` |
| Auto-logout | If timer reaches 0:00, auto-redirect to `/login` with "session expired" message |
| Background tabs | Uses `BroadcastChannel` API to sync session across tabs — extending in one tab extends all |

### Session Security Rules

| Rule | Implementation |
|---|---|
| Idle timeout | 30 minutes of inactivity → warning modal appears |
| Max session | 8 hours (admin) / 12 hours (operator) |
| Concurrent sessions | Max 2 per user; new login invalidates oldest |
| Remember me | Extends idle timeout to 7 days, max session to 30 days |
| Token storage | `httpOnly` cookie (not localStorage) in production; localStorage for development |

## 9.5 First-Time Login / Forced Password Change

When an admin creates a new user account, the user receives an email with a temporary password. On first login:

1. Normal login flow succeeds
2. API returns `forcePasswordChange: true`
3. Redirect to `/change-password` with a `StepsForm`:
   - Step 1: Current (temporary) password
   - Step 2: New password (with strength meter) + confirm
   - Step 3: Optional MFA setup (`QRCode` component displaying TOTP secret)
4. After completion, redirect to main dashboard

---

# Section 10: Portal App Architecture Note

## 10.1 Unified Portal vs Separate Apps

The NCTS codebase contains **four frontend applications**:

| App | Path | Purpose | Auth Required |
|---|---|---|---|
| Web (Operator) | `apps/web/` | Licensed cannabis operator workflows | Yes (operator role) |
| Admin (Government) | `apps/admin/` | Government regulatory dashboard | Yes (admin role) |
| Verify (Public) | `apps/verify/` | Public product verification | No |
| Portal (Unified) | `apps/portal/` | Combined app with role-based routing | Yes |

### Relationship

`apps/portal/` is the **unified production deployment target** that combines the operator and admin experiences into a single application with authentication-based routing. It imports the same page components specified in Sections 3 and 4, wrapping them in the appropriate layout (`OperatorLayout` or `AdminLayout`) based on the authenticated user's role.

The separate `apps/web/`, `apps/admin/`, and `apps/verify/` remain as:
- **Module-specific development targets** — developers can run just `apps/web/` to work on operator pages without needing the full auth flow
- **Standalone deployment options** — for environments where separate deployments are preferred (e.g., different security zones for government vs operator)
- **Code organization boundaries** — page components are authored in their respective app, then imported/aliased by `apps/portal/`

### Portal Architecture (Current)

From `apps/portal/src/App.tsx`:

```typescript
// Lazy-loaded page imports
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/operator/DashboardPage'));
// ... more operator pages
const NationalDashboardPage = lazy(() => import('./pages/admin/NationalDashboardPage'));
// ... more admin pages

// Route structure (matches actual apps/portal/src/App.tsx)
<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/verify" element={<VerifyHome />} />
  <Route path="/verify/:trackingId" element={<VerifyResult />} />
  
  {/* Operator routes — prefixed with /operator */}
  <Route path="/operator" element={
    <ProtectedRoute allowedRoles={['operator_admin', 'operator_staff']}>
      <OperatorLayout />
    </ProtectedRoute>
  }>
    <Route index element={<OperatorDashboard />} />
    <Route path="facilities" element={<FacilitiesPage />} />
    <Route path="plants" element={<PlantsPage />} />
    <Route path="plants/register" element={<PlantRegisterPage />} />
    <Route path="harvests" element={<HarvestsPage />} />
    <Route path="transfers" element={<TransfersPage />} />
    <Route path="sales" element={<SalesPage />} />
    <Route path="lab-results" element={<LabResultsPage />} />
  </Route>
  
  {/* Admin routes — prefixed with /admin */}
  <Route path="/admin" element={
    <ProtectedRoute allowedRoles={['regulator', 'inspector']}>
      <AdminLayout />
    </ProtectedRoute>
  }>
    <Route index element={<AdminDashboard />} />
    <Route path="operators" element={<OperatorsPage />} />
    <Route path="permits" element={<PermitsPage />} />
    <Route path="compliance" element={<CompliancePage />} />
  </Route>
  
  {/* Root redirect based on role */}
  <Route path="/" element={<RoleBasedRedirect />} />
</Routes>
```

### Implementation Impact

When implementing pages from Sections 3 and 4:
1. **Author components in their module app** (`apps/web/` or `apps/admin/`) for isolation during development
2. **Import/alias into `apps/portal/`** via lazy imports for the unified build
3. **Share all UI components** from `packages/ui/` — both apps consume the same design system
4. **Auth context** is only needed in `apps/portal/`; separate apps can mock auth for development
5. **Routing prefixes** differ: operator routes use `/operator/*` prefix (`/operator/facilities`, `/operator/plants`), admin routes use `/admin/*` prefix (`/admin/operators`, `/admin/permits`). Root `/` redirects based on user role.

---

# Section 11: Chart Library Standardization

## 11.1 Decision

**Selected library: `@ant-design/charts`**

### Rationale

| Factor | Decision |
|---|---|
| Plan.md reference | Plan.md mentions "Apache ECharts + Recharts" — however, `@ant-design/charts` is built on AntV G2 and provides a unified Ant Design-themed charting API that covers all the same chart types |
| Theme integration | `@ant-design/charts` automatically inherits Ant Design 5 theme tokens (colors, fonts, border-radius) — zero config needed |
| Bundle size | Tree-shakeable; chart types imported individually (`import { Line } from '@ant-design/charts'`) |
| Consistency | All charts across operator and admin apps use the same library and theme |
| Existing references | Already referenced throughout this document; no change needed to chart specifications in Sections 3–5 |

### Standardized Import Pattern

```typescript
// ✅ Correct — use @ant-design/charts for all chart needs
import { Line, Column, Pie, DualAxes, Area, Gauge } from '@ant-design/charts';

// ❌ Do NOT use these directly
// import { LineChart } from 'recharts';
// import * as echarts from 'echarts';
```

### Chart Theme Configuration

All charts inherit the NCTS design system via global chart theme registration in `packages/ui/src/tokens/chartTheme.ts`:

```typescript
import { G2 } from '@ant-design/charts';

G2.registerTheme('ncts', {
  defaultColor: '#1B3A5C',
  colors10: [
    '#1B3A5C', // Primary blue
    '#007A4D', // Secondary green
    '#FFB81C', // Accent gold
    '#DE3831', // Error red
    '#2196F3', // Info blue
    '#9C27B0', // Purple
    '#FF9800', // Orange
    '#795548', // Brown
    '#607D8B', // Grey-blue
    '#E91E63', // Pink
  ],
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
});
```

### Chart Accessibility

All chart instances must include:
- `aria-label` describing the chart purpose
- `alt` text summary of key data points
- Keyboard-navigable data points (Ant Charts supports this via `interactions: [{ type: 'element-active' }]`)
- Color-blind safe palette (the 10 colors above are WCAG distinguishable; additionally patterns/hatching for critical charts)

---

# Section 12: Missing API Hooks Gap List

The following hooks are referenced in this document but **do not yet exist** in `packages/api-client/src/hooks/`. They must be created during implementation.

## 12.1 Hooks Referenced in Operator Portal (Section 3)

| Hook Name | Section | Purpose | Suggested Endpoint |
|---|---|---|---|
| `useOperatorDashboard()` | 3.1 | Aggregated operator dashboard data (plants, transfers, sales, compliance) | `GET /api/v1/operators/:id/dashboard` |
| `useGlobalSearch(query)` | 2.19 | Cross-entity search (plants, transfers, facilities, sales) | `GET /api/v1/search?q=:query` |
| `useActivityFeed()` | 3.1 | Recent activity timeline for operator | `GET /api/v1/operators/:id/activity` |
| `useNotifications()` | 1.3 | User notifications (bell icon in header) | `GET /api/v1/notifications` |
| `useMarkNotificationRead(id)` | 1.3 | Mark single notification as read | `PATCH /api/v1/notifications/:id/read` |

## 12.2 Hooks Referenced in Government Dashboard (Section 4)

| Hook Name | Section | Purpose | Suggested Endpoint |
|---|---|---|---|
| `useSalesAggregate(period)` | 4.1 | Aggregated sales data by time period | `GET /api/v1/regulatory/sales-aggregate?period=:period` |
| `useComplianceAverage()` | 4.1 | System-wide average compliance score | `GET /api/v1/regulatory/compliance-average` |
| `useInspections(filters)` | 4.9 | List inspections with filtering | `GET /api/v1/inspections` |
| `useInspection(id)` | 4.9 | Single inspection detail | `GET /api/v1/inspections/:id` |
| `useCreateInspection()` | 4.9 | Schedule new inspection | `POST /api/v1/inspections` |
| `useUpdateInspection(id)` | 4.9 | Update inspection (record findings) | `PATCH /api/v1/inspections/:id` |
| `useInspectionAnalytics()` | 4.9 | Inspection statistics and trends | `GET /api/v1/inspections/analytics` |
| `useAuditLog(filters)` | 4.7 | System audit log with filtering | `GET /api/v1/audit` |
| `useSystemSettings()` | 4.8 | System configuration | `GET /api/v1/settings` |
| `useUpdateSystemSettings()` | 4.8 | Update system configuration | `PATCH /api/v1/settings` |
| `useAdminUsers()` | 4.8 | List admin users for management | `GET /api/v1/admin/users` |

## 12.3 Hooks Referenced in Auth (Section 9)

| Hook Name | Section | Purpose | Suggested Endpoint |
|---|---|---|---|
| `useLogin(credentials)` | 9.1 | Email/password authentication | `POST /api/v1/auth/login` |
| `useVerifyMfa(code)` | 9.2 | MFA code verification | `POST /api/v1/auth/mfa/verify` |
| `useForgotPassword(email)` | 9.3 | Request password reset | `POST /api/v1/auth/forgot-password` |
| `useResetPassword(token, password)` | 9.3 | Reset password with token | `POST /api/v1/auth/reset-password` |
| `useRefreshSession()` | 9.4 | Extend session / refresh token | `POST /api/v1/auth/refresh` |
| `useChangePassword()` | 9.5 | Change password (first login / voluntary) | `POST /api/v1/auth/change-password` |
| `useSetupMfa()` | 9.5 | Get MFA setup QR code | `POST /api/v1/auth/mfa/setup` |

## 12.4 Existing Hooks (No Action Needed)

For reference, the following hooks already exist in `packages/api-client/src/hooks/index.ts`:

```
usePlants, usePlant, useCreatePlant, useBatchRegisterPlants, useUpdatePlantState,
useFacilities, useFacility, useFacilityZones, useCreateFacility, useUpdateFacility, useCreateZone,
useHarvests, useHarvest, useCreateHarvest, useUpdateHarvest,
useLabResults, useLabResult, useLabResultsByBatch, useSubmitLabResult,
useTransfers, useTransfer, useInitiateTransfer, useAcceptTransfer, useRejectTransfer,
useSales, useSale, useRecordSale,
useBatches, useBatch,
useRegulatoryDashboard, useRegulatoryTrends, useFacilitiesGeo,
useOperators, usePermits, useUpdatePermitStatus, useComplianceAlerts,
useVerifyProduct
```

---

# Implementation Priority

## Phase 4 Execution Order (Frontend Implementation)

```
Week 1-2: Foundation
├── 1. Design system tokens + Ant theme config (Section 0)
├── 2. GovMasthead + GovFooter + PhaseBanner (Section 2.1-2.3)
├── 3. ProLayout migration for both apps (Section 1.3-1.4)
└── 4. Skeleton + Error + Empty state components (Section 1.7-1.9, 2.13-2.14)

Week 3-4: Core Components
├── 5. StatusBadge + TrackingId + NctsLogo enhanced (Section 2.4-2.6)
├── 6. StatCard + DataFreshness + ComplianceScore (Section 2.7-2.8, 2.12)
├── 7. PlantLifecycle + TransferTimeline (Section 2.9-2.10)
├── 8. SearchGlobal + CsvExport + PrintButton (Section 2.19-2.21)
└── 9. OfflineBanner + SyncStatus + LanguageSwitcher (Section 2.16-2.18)

Week 5-6: Operator Portal Pages
├── 10. Dashboard redesign (Section 3.1)
├── 11. Facilities page (Section 3.2)
├── 12. Plants list + ProTable migration (Section 3.3)
├── 13. Plant registration wizard enhancement (Section 3.4)
├── 14. Plant detail page (new) (Section 3.5)
├── 15. Harvests page (Section 3.6)
├── 16. Lab results page (Section 3.7)
├── 17. Transfers page + detail + wizard (Section 3.8)
├── 18. Sales page + record flow (Section 3.9)
└── 19. Profile + Settings pages (Section 3.10)

Week 7-8: Government Dashboard Pages
├── 20. National overview dashboard (Section 4.1)
├── 21. Operators page + detail (Section 4.2)
├── 22. Permits page + review workflow (Section 4.3)
├── 23. Compliance page + alerts (Section 4.4)
├── 24. Facilities map (Section 4.5)
├── 25. Reports page suite (Section 4.6)
├── 26. Audit log page (Section 4.7)
├── 27. System settings (Section 4.8)
└── 28. Inspection management (calendar, forms, recording) (Section 4.9)

Week 9: Authentication & Public Verification
├── 29. Login page + MFA flow (Section 9.1-9.2)
├── 30. Forgot/reset password (Section 9.3)
├── 31. Session management + expiry modal (Section 9.4)
├── 32. First-login forced password change (Section 9.5)
├── 33. Tailwind + Shadcn setup for verify app (Section 5.1)
├── 34. Verify home page redesign (Section 5.3)
├── 35. Verification result page (Section 5.4)
└── 36. QR scanner page (Section 5.5)

Week 10: Advanced + Polish
├── 37. Real-time WebSocket integration (Section 6.1)
├── 38. Offline service worker (Section 6.2)
├── 39. Chart theme registration (Section 11)
├── 40. Mobile bottom nav + responsive polish (Section 7)
├── 41. Accessibility audit + fixes (Section 8.1-8.3)
├── 42. i18n setup + English strings externalized (Section 8.4)
├── 43. POPIA compliance (consent, data export) (Section 8.5)
└── 44. Create missing API hooks stubs (Section 12)
```

---

*End of FrontEnd.md — NCTS Frontend Master Plan v1.1*
