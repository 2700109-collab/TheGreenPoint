import { useState } from 'react';
import {
  Card,
  Tabs,
  Switch,
  Table,
  Input,
  Select,
  Button,
  Typography,
  Space,
  Divider,
  message,
  Row,
  Col,
  TimePicker,
} from 'antd';
import { Copy, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import { NctsPageContainer } from '@ncts/ui';

const { Text, Paragraph, Title } = Typography;

// ---------------------------------------------------------------------------
// Mock Data — settings don't have a proper endpoint yet
// TODO: Wire to /settings API when available
// ---------------------------------------------------------------------------

const MOCK_GENERAL = {
  operatingStart: dayjs('08:00', 'HH:mm'),
  operatingEnd: dayjs('17:00', 'HH:mm'),
  timezone: 'Africa/Johannesburg',
  dateFormat: 'DD/MM/YYYY',
  currency: 'ZAR',
};

interface NotificationRow {
  key: string;
  eventType: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

const MOCK_NOTIFICATIONS: NotificationRow[] = [
  { key: '1', eventType: 'Plant registered', email: true, sms: false, push: true },
  { key: '2', eventType: 'Transfer initiated', email: true, sms: true, push: true },
  { key: '3', eventType: 'Transfer received', email: true, sms: true, push: true },
  { key: '4', eventType: 'Harvest completed', email: true, sms: false, push: false },
  { key: '5', eventType: 'Lab result ready', email: true, sms: true, push: true },
  { key: '6', eventType: 'Compliance alert', email: true, sms: true, push: true },
  { key: '7', eventType: 'Permit expiry warning', email: true, sms: true, push: true },
];

const MOCK_API_KEY = {
  masked: 'sk_live_****************************7f3a',
  lastRegenerated: '2025-11-20T09:15:00Z',
  totalRequests: 12_340,
};

const MOCK_EXPORT = {
  lastExport: '2026-01-15T14:30:00Z',
};

// ---------------------------------------------------------------------------
// Sub-tabs
// ---------------------------------------------------------------------------

function GeneralTab() {
  return (
    <Card title="General Preferences">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={6}>
            <Text strong>Operating Hours</Text>
          </Col>
          <Col xs={24} sm={18}>
            <Space>
              <TimePicker defaultValue={MOCK_GENERAL.operatingStart} format="HH:mm" />
              <Text>to</Text>
              <TimePicker defaultValue={MOCK_GENERAL.operatingEnd} format="HH:mm" />
            </Space>
          </Col>
        </Row>

        <Row gutter={16} align="middle">
          <Col xs={24} sm={6}>
            <Text strong>Timezone</Text>
          </Col>
          <Col xs={24} sm={18}>
            <Select
              defaultValue={MOCK_GENERAL.timezone}
              style={{ width: 260 }}
              options={[
                { label: 'Africa/Johannesburg (SAST, UTC+2)', value: 'Africa/Johannesburg' },
                { label: 'Africa/Lagos (WAT, UTC+1)', value: 'Africa/Lagos' },
                { label: 'UTC', value: 'UTC' },
              ]}
            />
          </Col>
        </Row>

        <Row gutter={16} align="middle">
          <Col xs={24} sm={6}>
            <Text strong>Date Format</Text>
          </Col>
          <Col xs={24} sm={18}>
            <Select
              defaultValue={MOCK_GENERAL.dateFormat}
              style={{ width: 200 }}
              options={[
                { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
                { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
                { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
              ]}
            />
          </Col>
        </Row>

        <Row gutter={16} align="middle">
          <Col xs={24} sm={6}>
            <Text strong>Currency</Text>
          </Col>
          <Col xs={24} sm={18}>
            <Input defaultValue={MOCK_GENERAL.currency} disabled style={{ width: 120 }} />
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0' }} />
        <Button type="primary" onClick={() => message.success('Settings saved')}>
          Save Changes
        </Button>
      </Space>
    </Card>
  );
}

function NotificationsTab() {
  const [data, setData] = useState<NotificationRow[]>(MOCK_NOTIFICATIONS);

  const toggle = (key: string, field: 'email' | 'sms' | 'push') => {
    setData((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: !r[field] } : r)),
    );
  };

  const columns = [
    { title: 'Event Type', dataIndex: 'eventType', key: 'eventType' },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (val: boolean, record: NotificationRow) => (
        <Switch checked={val} onChange={() => toggle(record.key, 'email')} size="small" />
      ),
    },
    {
      title: 'SMS',
      dataIndex: 'sms',
      key: 'sms',
      render: (val: boolean, record: NotificationRow) => (
        <Switch checked={val} onChange={() => toggle(record.key, 'sms')} size="small" />
      ),
    },
    {
      title: 'Push',
      dataIndex: 'push',
      key: 'push',
      render: (val: boolean, record: NotificationRow) => (
        <Switch checked={val} onChange={() => toggle(record.key, 'push')} size="small" />
      ),
    },
  ];

  return (
    <Card title="Notification Preferences">
      <Table
        dataSource={data}
        columns={columns}
        pagination={false}
        size="middle"
        style={{ marginBottom: 16 }}
      />
      <Button type="primary" onClick={() => message.success('Notification preferences saved')}>
        Save Changes
      </Button>
    </Card>
  );
}

function ApiKeysTab() {
  return (
    <Card title="API Keys">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text strong>Live API Key</Text>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
              padding: '8px 12px',
              background: '#fafafa',
              borderRadius: 6,
              border: '1px solid #d9d9d9',
              fontFamily: 'monospace',
            }}
          >
            <Text copyable={{ icon: <Copy size={14} /> }}>{MOCK_API_KEY.masked}</Text>
          </div>
        </div>

        <div>
          <Text type="secondary">
            Last regenerated: {dayjs(MOCK_API_KEY.lastRegenerated).format('DD MMM YYYY, HH:mm')}
          </Text>
        </div>

        <Button
          danger
          icon={<RefreshCw size={14} />}
          onClick={() => message.warning('API key regeneration would require confirmation')}
        >
          Regenerate Key
        </Button>

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <Text strong>Usage</Text>
          <Paragraph type="secondary" style={{ marginTop: 4 }}>
            Total API requests this month: {MOCK_API_KEY.totalRequests.toLocaleString()}
          </Paragraph>
          {/* TODO: Add usage chart / table */}
        </div>
      </Space>
    </Card>
  );
}

function DataExportTab() {
  return (
    <Card title="Data Export">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Paragraph type="secondary">
          Export all your data in accordance with POPIA (Protection of Personal Information Act).
          You have the right to request a copy of all data held about your operations.
        </Paragraph>

        <Space wrap>
          <Button
            icon={<Download size={14} />}
            onClick={() => message.info('Exporting plants CSV…')}
          >
            Export Plants (CSV)
          </Button>
          <Button
            icon={<Download size={14} />}
            onClick={() => message.info('Exporting transfers CSV…')}
          >
            Export Transfers (CSV)
          </Button>
          <Button
            type="primary"
            icon={<Download size={14} />}
            onClick={() => message.info('Preparing full data export…')}
          >
            Export Full Data (ZIP)
          </Button>
        </Space>

        <Text type="secondary">
          Last export: {dayjs(MOCK_EXPORT.lastExport).format('DD MMM YYYY, HH:mm')}
        </Text>
      </Space>
    </Card>
  );
}

function DangerZoneTab() {
  return (
    <Card
      title={
        <Space>
          <AlertTriangle size={16} style={{ color: '#cf1322' }} />
          <span>Danger Zone</span>
        </Space>
      }
      style={{ border: '1px solid #ff4d4f' }}
    >
      <Title level={5}>Deactivate Account</Title>
      <Paragraph type="secondary" style={{ maxWidth: 600 }}>
        Deactivating your account will immediately revoke API access, disable all scheduled
        transfers, and archive your data. This action requires administrative review and cannot be
        undone without contacting NCTS support. All active plants will be flagged for regulatory
        review.
      </Paragraph>
      <Button
        danger
        type="primary"
        onClick={() =>
          message.warning('Account deactivation requires confirmation — not yet implemented')
        }
      >
        Request Account Deactivation
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const tabItems = [
    { key: 'general', label: 'General', children: <GeneralTab /> },
    { key: 'notifications', label: 'Notifications', children: <NotificationsTab /> },
    { key: 'api-keys', label: 'API Keys', children: <ApiKeysTab /> },
    { key: 'data-export', label: 'Data Export', children: <DataExportTab /> },
    { key: 'danger-zone', label: 'Danger Zone', children: <DangerZoneTab /> },
  ];

  return (
    <NctsPageContainer title="Settings">
      <Tabs defaultActiveKey="general" items={tabItems} />
    </NctsPageContainer>
  );
}
