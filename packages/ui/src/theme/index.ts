/**
 * NCTS Theme — Ant Design 5 ThemeConfig
 *
 * Built from the canonical design tokens in `@ncts/ui/tokens`.
 * This file is the single source of truth consumed by every NCTS front-end app.
 * All values match FrontEnd.md §0.10 specification exactly.
 */
import type { ThemeConfig } from 'antd';

import {
  primary,
  secondary,
  accent,
  semantic,
  neutral,
  surface,
  text,
} from '../tokens/colors';
import { fontFamily } from '../tokens/typography';
import { radius } from '../tokens/radius';
import { shadows } from '../tokens/shadows';

// ---------------------------------------------------------------------------
// Backward-compatible convenience re-exports (colours / fonts shorthand)
// ---------------------------------------------------------------------------
export const colors = {
  primary: primary[500],
  secondary: secondary[500],
  accent: accent[500],
  success: semantic.success.text,
  warning: semantic.warning.text,
  error: semantic.error.text,
  info: semantic.info.text,
} as const;

export const fonts = {
  body: fontFamily.body,
  mono: fontFamily.mono,
} as const;

// ---------------------------------------------------------------------------
// Full NCTS Ant Design 5 Theme — per FrontEnd.md §0.10
// ---------------------------------------------------------------------------

/** Complete NCTS theme config with all component overrides. */
export const nctsTheme: ThemeConfig = {
  token: {
    // Brand colours
    colorPrimary: primary[500],
    colorSuccess: semantic.success.text,
    colorWarning: semantic.warning.text,
    colorError: semantic.error.text,
    colorInfo: semantic.info.text,

    // Link colours
    colorLink: text.link,

    // Text colours
    colorText: text.primary,
    colorTextSecondary: text.secondary,
    colorTextTertiary: text.tertiary,
    colorTextDisabled: text.disabled,
    colorTextBase: text.primary,

    // Background & border
    colorBgBase: '#FFFFFF',
    colorBgContainer: surface.card,
    colorBgLayout: surface.background,
    colorBgElevated: surface.elevated,
    colorBorder: neutral[300],
    colorBorderSecondary: neutral[200],

    // Typography
    fontFamily: fontFamily.body,
    fontFamilyCode: fontFamily.mono,
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

    // Shape
    borderRadius: radius.md,
    borderRadiusSM: radius.sm,
    borderRadiusLG: radius.lg,
    borderRadiusXS: 2,
    controlHeight: 36,
    controlHeightSM: 28,
    controlHeightLG: 44,

    // Spacing
    padding: 16,
    paddingSM: 12,
    paddingLG: 24,
    paddingXS: 8,
    margin: 16,
    marginSM: 12,
    marginLG: 24,
    marginXS: 8,

    // Shadows
    boxShadow: shadows.sm,
    boxShadowSecondary: shadows.md,

    // Motion
    motionDurationFast: '0.15s',
    motionDurationMid: '0.25s',
    motionDurationSlow: '0.4s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  components: {
    // ── Button — §0.10 ─────────────────────────────────────────────────
    Button: {
      borderRadius: radius.md,
      controlHeight: 36,
      controlHeightSM: 28,
      controlHeightLG: 44,
      fontWeight: 500,
    },

    // ── Table — §0.10 ──────────────────────────────────────────────────
    Table: {
      borderRadius: 8,
      headerBg: neutral[50],
      headerColor: text.primary,
      headerSortActiveBg: '#F0F0F0',
      headerSplitColor: neutral[200],
      rowHoverBg: primary[50],
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },

    // ── Card ────────────────────────────────────────────────────────────
    Card: {
      colorBgContainer: surface.card,
      borderRadiusLG: radius.lg,
      paddingLG: 24,
    },

    // ── Input ───────────────────────────────────────────────────────────
    Input: {
      colorBorder: neutral[300],
      colorBgContainer: surface.card,
      borderRadius: radius.md,
      controlHeight: 36,
    },

    // ── Select ──────────────────────────────────────────────────────────
    Select: {
      colorBorder: neutral[300],
      borderRadius: radius.md,
      controlHeight: 36,
    },

    // ── Modal ───────────────────────────────────────────────────────────
    Modal: {
      borderRadiusLG: radius.xl,
    },

    // ── Menu ────────────────────────────────────────────────────────────
    Menu: {
      darkItemBg: surface.sidebar,
      darkItemSelectedBg: primary[500],
      darkItemColor: neutral[300],
      darkItemHoverBg: primary[700],
      itemBorderRadius: radius.md,
    },

    // ── Layout ──────────────────────────────────────────────────────────
    Layout: {
      siderBg: surface.sidebar,
      headerBg: surface.card,
      bodyBg: surface.background,
    },

    // ── Tabs ────────────────────────────────────────────────────────────
    Tabs: {
      inkBarColor: primary[500],
      itemSelectedColor: primary[500],
      itemHoverColor: primary[400],
    },

    // ── Tag ─────────────────────────────────────────────────────────────
    Tag: {
      borderRadiusSM: radius.sm,
    },

    // ── Badge ───────────────────────────────────────────────────────────
    Badge: {
      colorError: semantic.error.text,
      dotSize: 8,
    },

    // ── Steps ───────────────────────────────────────────────────────────
    Steps: {
      colorPrimary: secondary[500],
    },

    // ── Form ────────────────────────────────────────────────────────────
    Form: {
      labelColor: neutral[700],
      labelFontSize: 14,
    },

    // ── Notification ────────────────────────────────────────────────────
    Notification: {
      colorBgElevated: surface.elevated,
      borderRadiusLG: radius.lg,
    },

    // ── Message ─────────────────────────────────────────────────────────
    Message: {
      colorBgElevated: surface.elevated,
      borderRadiusLG: radius.lg,
    },
  },
};

/** @deprecated Use `nctsTheme` instead. Kept for backward compatibility. */
export const themeConfig: ThemeConfig = nctsTheme;
