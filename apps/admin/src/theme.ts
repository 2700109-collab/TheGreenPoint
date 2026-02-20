import type { ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#1B3A5C',
    colorSuccess: '#007A4D',
    colorWarning: '#FFB81C',
    colorError: '#FF4D4F',
    colorInfo: '#1890FF',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyCode: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 14,
    borderRadius: 6,
    controlHeight: 36,
  },
  components: {
    Layout: {
      siderBg: '#0a1929',
      headerBg: '#ffffff',
      bodyBg: '#f0f2f5',
    },
    Menu: {
      darkItemBg: '#0a1929',
      darkItemSelectedBg: '#1B3A5C',
    },
  },
};
