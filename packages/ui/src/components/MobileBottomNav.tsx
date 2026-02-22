import React, { useState, useCallback } from 'react';
import { Drawer } from 'antd';
import { Menu } from 'lucide-react';
import { primary, neutral, zIndex, duration, easing } from '../tokens';

export interface NavTab {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  /** Optional notification badge count shown on the tab icon. */
  badge?: number;
}

export interface MobileBottomNavProps {
  tabs: NavTab[];
  activeKey: string;
  onTabChange: (key: string, path: string) => void;
  moreItems?: NavTab[];
  className?: string;
}

const NAV_HEIGHT = 56;
const BORDER_COLOR = '#E8E8E8';
const INACTIVE_COLOR = neutral[500]; // #8C8C8C
const ACTIVE_COLOR = primary[500];   // #1B3A5C
const TRANSITION = `color ${duration.fast}ms ${easing.default}`;

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  tabs,
  activeKey,
  onTabChange,
  moreItems,
  className,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTabClick = useCallback(
    (key: string, path: string) => {
      onTabChange(key, path);
    },
    [onTabChange],
  );

  const handleMoreClick = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleDrawerItemClick = useCallback(
    (key: string, path: string) => {
      setDrawerOpen(false);
      onTabChange(key, path);
    },
    [onTabChange],
  );

  const allTabs: NavTab[] = moreItems && moreItems.length > 0
    ? [...tabs, { key: '__more__', icon: <Menu size={20} />, label: 'More', path: '' }]
    : tabs;

  return (
    <>
      <nav
        className={className}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: NAV_HEIGHT,
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: '#FFFFFF',
          borderTop: `1px solid ${BORDER_COLOR}`,
          zIndex: zIndex.fixed,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {allTabs.map((tab) => {
          const isMore = tab.key === '__more__';
          const isActive = !isMore && activeKey === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => (isMore ? handleMoreClick() : handleTabClick(tab.key, tab.path))}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                height: '100%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                fontWeight: isActive ? 600 : 400,
                fontSize: 11,
                lineHeight: 1,
                transition: TRANSITION,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {tab.icon}
                {!isMore && tab.badge != null && tab.badge > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -8,
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: 8,
                      background: '#E53E3E',
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {moreItems && moreItems.length > 0 && (
        <Drawer
          placement="bottom"
          open={drawerOpen}
          onClose={handleDrawerClose}
          height="auto"
          styles={{
            body: { maxHeight: '50vh', overflowY: 'auto', padding: 0 },
            wrapper: { maxHeight: '50vh' },
          }}
          closable={false}
        >
          {moreItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleDrawerItemClick(item.key, item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '14px 20px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                color: activeKey === item.key ? ACTIVE_COLOR : neutral[800],
                fontWeight: activeKey === item.key ? 600 : 400,
                transition: TRANSITION,
                borderBottom: `1px solid ${BORDER_COLOR}`,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </Drawer>
      )}
    </>
  );
};
