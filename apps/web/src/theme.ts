import type { ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    // Primary — Deep Blue (trust, authority)
    colorPrimary: '#1B3A5C',
    // Success — South African green (cannabis/agriculture)
    colorSuccess: '#007A4D',
    // Warning — Gold (SA flag reference)
    colorWarning: '#FFB81C',
    // Error
    colorError: '#FF4D4F',
    // Info
    colorInfo: '#1890FF',
    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyCode: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 14,
    // Border radius
    borderRadius: 6,
    // Sizing
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
      darkItemSelectedBg: '#1B3A5C',
    },
    Table: {
      headerBg: '#fafafa',
    },
  },
};
