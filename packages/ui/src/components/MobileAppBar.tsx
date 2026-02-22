import React from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { primary } from '../tokens';

export interface AppBarAction {
  icon: React.ReactNode;
  onClick: () => void;
  key?: string;
}

export interface MobileAppBarProps {
  /** Centered title text. */
  title: string;
  /** If provided, a back-arrow button is shown on the left and calls this handler. */
  onBack?: () => void;
  /** Actions rendered in an overflow menu on the right. */
  actions?: AppBarAction[];
}

const BAR_HEIGHT = 56;
const BG_COLOR = primary[500]; // SA government blue #1B3A5C

/**
 * Fixed top bar for mobile views.
 * Shows a back arrow (left), centered title, and overflow-menu actions (right).
 */
export const MobileAppBar: React.FC<MobileAppBarProps> = ({ title, onBack, actions }) => {
  const menuItems: MenuProps['items'] =
    actions?.map((action, idx) => ({
      key: action.key ?? String(idx),
      icon: action.icon,
      onClick: action.onClick,
    })) ?? [];

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: BAR_HEIGHT,
        background: BG_COLOR,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        zIndex: 1100,
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
      }}
    >
      {/* Left: back button or spacer */}
      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {onBack && (
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ArrowLeft size={22} />
          </button>
        )}
      </div>

      {/* Center: title */}
      <span
        style={{
          flex: 1,
          textAlign: 'center',
          fontWeight: 600,
          fontSize: 16,
          lineHeight: `${BAR_HEIGHT}px`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </span>

      {/* Right: overflow menu or spacer */}
      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {menuItems.length > 0 && (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <button
              type="button"
              aria-label="More options"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <MoreVertical size={22} />
            </button>
          </Dropdown>
        )}
      </div>
    </header>
  );
};
