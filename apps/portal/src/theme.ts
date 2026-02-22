import type { ThemeConfig } from 'antd';

export const colors = {
  navy: '#003B5C',
  navyDark: '#00263A',
  gold: '#D4A843',
  green: '#007A4D',
  red: '#C8102E',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  bg: '#F0F2F5',
  card: '#FFFFFF',
  text: '#1A2332',
  textSecondary: '#5A6B7F',
  border: '#E2E8F0',
  sidebar: '#001529',
};

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: colors.navy,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.red,
    colorInfo: colors.navy,
    borderRadius: 6,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    colorBgLayout: colors.bg,
    colorBgContainer: colors.card,
    colorText: colors.text,
    colorTextSecondary: colors.textSecondary,
    colorBorder: colors.border,
    controlHeight: 40,
  },
  components: {
    Layout: {
      siderBg: colors.sidebar,
      headerBg: colors.card,
      headerHeight: 56,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(255,255,255,0.08)',
      darkItemHoverBg: 'rgba(255,255,255,0.04)',
      darkItemSelectedColor: colors.gold,
      itemBorderRadius: 6,
      iconSize: 16,
    },
    Table: {
      headerBg: '#FAFBFC',
      headerColor: colors.textSecondary,
      borderColor: '#F0F0F0',
      rowHoverBg: '#FAFBFC',
    },
    Card: {
      borderRadiusLG: 8,
    },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      fontWeight: 500,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Input: {
      controlHeight: 42,
    },
    Select: {
      controlHeight: 42,
    },
    Breadcrumb: {
      fontSize: 13,
    },
  },
};
