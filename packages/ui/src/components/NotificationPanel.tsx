import React, { useState } from 'react';
import { Badge, Button, Empty, List, Popover, Typography } from 'antd';
import { Bell, CheckCheck, AlertTriangle, Info, AlertCircle, Mail } from 'lucide-react';

const { Text, Link } = Typography;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Severity level determines the icon and colour used for each notification. */
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'default';

/** A single in-app notification. */
export interface Notification {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
  severity?: NotificationSeverity;
}

export interface NotificationPanelProps {
  /** List of notifications to display. */
  notifications: Notification[];
  /** Called when the user marks a single notification as read. */
  onMarkRead: (id: string) => void;
  /** Called when the user clicks "Mark all as read". */
  onMarkAllRead: () => void;
  /** Called when the user clicks "View all notifications". */
  onViewAll: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ICON_SIZE = 16;

function severityIcon(severity: NotificationSeverity | undefined) {
  switch (severity) {
    case 'critical':
      return <AlertCircle size={ICON_SIZE} style={{ color: '#f5222d' }} />;
    case 'warning':
      return <AlertTriangle size={ICON_SIZE} style={{ color: '#faad14' }} />;
    case 'info':
      return <Info size={ICON_SIZE} style={{ color: '#1677ff' }} />;
    default:
      return <Mail size={ICON_SIZE} style={{ color: '#8c8c8c' }} />;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * NotificationPanel
 *
 * Renders a bell-icon button with an unread count badge. Clicking the bell
 * opens a dropdown / popover panel listing recent notifications.
 */
export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onViewAll,
}) => {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Panel Content ──────────────────────────────────────────────────────────

  const panelContent = (
    <div style={{ width: 360, maxHeight: 440, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Text strong>
          Notifications{unreadCount > 0 ? ` (${unreadCount} new)` : ''}
        </Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={onMarkAllRead} icon={<CheckCheck size={14} />}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications"
            style={{ padding: '32px 0' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                onClick={() => {
                  if (!item.read) onMarkRead(item.id);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  background: item.read ? 'transparent' : '#f6ffed',
                }}
              >
                <List.Item.Meta
                  avatar={severityIcon(item.severity)}
                  title={
                    <Text strong={!item.read} style={{ fontSize: 13 }}>
                      {item.title}
                    </Text>
                  }
                  description={
                    <>
                      {item.description && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.description}
                        </Text>
                      )}
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {timeAgo(item.timestamp)}
                      </Text>
                    </>
                  }
                />
                {/* Unread dot indicator */}
                {!item.read && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#1677ff',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                )}
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
        <Link
          onClick={() => {
            setOpen(false);
            onViewAll();
          }}
        >
          View all notifications
        </Link>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Popover
      content={panelContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      overlayInnerStyle={{ padding: 0 }}
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<Bell size={20} />}
          aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
        />
      </Badge>
    </Popover>
  );
};
