import type { ThemeConfig } from 'antd';

// NCTS Design Tokens
export const colors = {
  primary: '#1B3A5C',
  secondary: '#007A4D',
  accent: '#FFB81C',
  success: '#52C41A',
  warning: '#FAAD14',
  error: '#FF4D4F',
  info: '#1890FF',
} as const;

export const fonts = {
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

/** Shared Ant Design 5 theme config — authoritative source for all NCTS apps */
export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: colors.primary,
    colorSuccess: colors.secondary,
    colorWarning: colors.accent,
    colorError: colors.error,
    colorInfo: colors.info,
    fontFamily: fonts.body,
    fontFamilyCode: fonts.mono,
    fontSize: 14,
    borderRadius: 6,
    controlHeight: 36,
  },
  components: {
    Layout: {
      siderBg: '#001529',
      headerBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemSelectedBg: colors.primary,
    },
    Table: {
      headerBg: '#fafafa',
    },
  },
};
