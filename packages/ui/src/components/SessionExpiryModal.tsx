import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Typography, Space } from 'antd';
import { Clock } from 'lucide-react';

const { Text, Title } = Typography;

export interface SessionExpiryModalProps {
  open: boolean;
  onExtend: () => void;
  onSignOut: () => void;
  expiresAt: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SessionExpiryModal({ open, onExtend, onSignOut, expiresAt }: SessionExpiryModalProps) {
  const calcRemaining = useCallback(() => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)), [expiresAt]);
  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    if (!open) return;
    setRemaining(calcRemaining());

    const interval = setInterval(() => {
      const next = calcRemaining();
      setRemaining(next);
      if (next <= 0) {
        clearInterval(interval);
        onSignOut();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, expiresAt, calcRemaining, onSignOut]);

  return (
    <Modal
      open={open}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
      width={400}
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <Clock
          size={48}
          color={remaining <= 60 ? '#f5222d' : '#fa8c16'}
          style={{ marginBottom: 16 }}
        />

        <Title level={4} style={{ margin: '0 0 8px' }}>
          Session Expiring
        </Title>

        <Text style={{ fontSize: 28, fontFamily: 'monospace', fontWeight: 700, display: 'block', margin: '12px 0' }}>
          {formatTime(remaining)}
        </Text>

        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Your session will expire soon. Any unsaved changes will be lost if you don&apos;t extend.
        </Text>

        <Space size={12}>
          <Button
            type="primary"
            size="large"
            onClick={onExtend}
            style={{ minWidth: 140, fontWeight: 600, background: '#1B3A5C' }}
          >
            Extend Session
          </Button>
          <Button size="large" onClick={onSignOut} style={{ minWidth: 140 }}>
            Sign Out
          </Button>
        </Space>
      </div>
    </Modal>
  );
}
