import React from 'react';
import { Drawer, Button } from 'antd';
import { useBreakpoint } from '../hooks/useBreakpoint';

export interface BottomSheetFilterProps {
  /** Whether the bottom sheet / drawer is open (mobile only). */
  open: boolean;
  /** Called when the user closes the bottom sheet. */
  onClose: () => void;
  /** Title displayed in the drawer header on mobile. */
  title?: React.ReactNode;
  /** Called when the user taps the Apply button (mobile only). */
  onApply?: () => void;
  /** Called when the user taps the Clear button (mobile only). */
  onClear?: () => void;
  children?: React.ReactNode;
}

/**
 * On mobile viewports renders children inside a bottom Drawer with rounded top corners.
 * On desktop the children are rendered inline without any wrapper.
 */
export const BottomSheetFilter: React.FC<BottomSheetFilterProps> = ({
  open,
  onClose,
  title,
  onApply,
  onClear,
  children,
}) => {
  const { isMobile } = useBreakpoint();

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <Drawer
      placement="bottom"
      open={open}
      onClose={onClose}
      title={title}
      height="auto"
      styles={{
        wrapper: {
          maxHeight: '85vh',
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
        },
        body: {
          overflowY: 'auto',
          paddingBottom: (onApply || onClear) ? 0 : 'env(safe-area-inset-bottom)',
        },
      }}
      footer={
        (onApply || onClear) ? (
          <div style={{ display: 'flex', gap: 8, paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {onClear && (
              <Button block onClick={() => { onClear(); onClose(); }}>
                Clear Filters
              </Button>
            )}
            {onApply && (
              <Button type="primary" block onClick={() => { onApply(); onClose(); }}>
                Apply Filters
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {children}
    </Drawer>
  );
};
