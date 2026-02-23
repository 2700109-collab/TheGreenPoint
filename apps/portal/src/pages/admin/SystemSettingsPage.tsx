/**
 * SystemSettingsPage — Admin system configuration with tabs.
 * Per FrontEnd.md §4.8.
 */

import { useState } from 'react';
import { Card, Tabs, Form, Input, Switch, Table, Tag, Button, Space, InputNumber, Badge, Spin, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Save, TestTube, Pencil, Trash2 } from 'lucide-react';
import { NctsPageContainer } from '@ncts/ui';
import { useSystemSettings, useUpdateSystemSettings, useAdminUsers } from '@ncts/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThresholdRow {
  key: string;
  metric: string;
  minor: number;
  major: number;
  critical: number;
  active: boolean;
}

interface AdminUser {
  key: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  status: 'active' | 'inactive';
}

interface Integration {
  name: string;
  status: 'connected' | 'disconnected' | 'degraded';
  endpoint: string;
}

interface NotificationTemplate {
  key: string;
  event: string;
  email: boolean;
  sms: boolean;
  interval: string;
}

interface RetentionRow {
  key: string;
  entityType: string;
  retentionPeriod: string;
  autoPurge: boolean;
  lastPurge: string;
}

// ---------------------------------------------------------------------------
// Mock Data DELETED (MOCK_THRESHOLDS, MOCK_ADMIN_USERS) — now using hooks
// MOCK_INTEGRATIONS, MOCK_NOTIFICATIONS, MOCK_RETENTION kept (no backend yet)
// ---------------------------------------------------------------------------

const MOCK_INTEGRATIONS: Integration[] = [
  { name: 'SARS', status: 'connected', endpoint: 'https://api.sars.gov.za/v2/cannabis' },
  { name: 'SAHPRA', status: 'connected', endpoint: 'https://api.sahpra.org.za/v1/permits' },
  { name: 'DALRRD', status: 'disconnected', endpoint: 'https://api.dalrrd.gov.za/v1/agriculture' },
];

const MOCK_NOTIFICATIONS: NotificationTemplate[] = [
  { key: '1', event: 'Permit Expiring', email: true, sms: true, interval: '14 days before' },
  { key: '2', event: 'Compliance Alert', email: true, sms: false, interval: 'Immediate' },
  { key: '3', event: 'Transfer Completed', email: true, sms: false, interval: 'Immediate' },
  { key: '4', event: 'Lab Result Ready', email: true, sms: true, interval: 'Immediate' },
  { key: '5', event: 'Monthly Report Due', email: true, sms: false, interval: '3 days before' },
];

const MOCK_RETENTION: RetentionRow[] = [
  { key: '1', entityType: 'Audit Logs', retentionPeriod: '7 years', autoPurge: true, lastPurge: '2026-01-01' },
  { key: '2', entityType: 'Plant Records', retentionPeriod: '5 years', autoPurge: false, lastPurge: '2025-12-01' },
  { key: '3', entityType: 'Transfer Records', retentionPeriod: '5 years', autoPurge: false, lastPurge: '2025-12-01' },
  { key: '4', entityType: 'Lab Results', retentionPeriod: '7 years', autoPurge: true, lastPurge: '2026-01-15' },
  { key: '5', entityType: 'User Sessions', retentionPeriod: '90 days', autoPurge: true, lastPurge: '2026-02-15' },
];

// ---------------------------------------------------------------------------
// Integration status badge colour
// ---------------------------------------------------------------------------

const INTEGRATION_STATUS: Record<Integration['status'], { color: string; label: string }> = {
  connected: { color: 'green', label: 'Connected' },
  disconnected: { color: 'red', label: 'Disconnected' },
  degraded: { color: 'orange', label: 'Degraded' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { data: settingsResponse, isLoading: settingsLoading } = useSystemSettings();
  const { data: usersResponse, isLoading: usersLoading } = useAdminUsers();
  const { mutateAsync: updateSettings, isPending: savePending } = useUpdateSystemSettings();

  const isLoading = settingsLoading || usersLoading;

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  // Map settings to threshold rows
  const rawSettings = settingsResponse?.data ?? settingsResponse ?? [];
  const thresholds: ThresholdRow[] = Array.isArray(rawSettings)
    ? rawSettings.map((s: any, idx: number) => ({
        key: s.id ?? String(idx + 1),
        metric: s.key ?? '',
        minor: (s.value as any)?.minor ?? 0,
        major: (s.value as any)?.major ?? 0,
        critical: (s.value as any)?.critical ?? 0,
        active: (s.value as any)?.active ?? true,
      }))
    : [];

  // Map admin users
  const rawUsers = usersResponse?.data ?? usersResponse ?? [];
  const adminUsers: AdminUser[] = Array.isArray(rawUsers)
    ? rawUsers.map((u: any, idx: number) => ({
        key: u.id ?? String(idx + 1),
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        email: u.email ?? '',
        role: u.role ?? 'Admin',
        lastLogin: u.lastLogin ?? '',
        status: u.active ? 'active' : 'inactive',
      }))
    : [];

  const handleSaveSettings = async () => {
    try {
      await updateSettings({ key: 'thresholds', value: thresholds } as any);
      message.success('Settings saved successfully');
    } catch {
      message.error('Failed to save settings');
    }
  };

  // -- General Tab ----------------------------------------------------------
  const generalTab = (
    <Card title="General Configuration">
      <Form layout="vertical" style={{ maxWidth: 480 }}>
        <Form.Item label="System Name" initialValue="NCTS">
          <Input defaultValue="NCTS" />
        </Form.Item>
        <Form.Item label="Support Email">
          <Input defaultValue="support@ncts.gov.za" />
        </Form.Item>
        <Form.Item label="Maintenance Mode" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Button type="primary" icon={<Save size={14} />} onClick={handleSaveSettings} loading={savePending}>Save Changes</Button>
      </Form>
    </Card>
  );

  // -- Compliance Thresholds Tab --------------------------------------------
  const thresholdColumns: ColumnsType<ThresholdRow> = [
    { title: 'Metric', dataIndex: 'metric', key: 'metric', width: 200 },
    {
      title: 'Minor', dataIndex: 'minor', key: 'minor', width: 120,
      render: (v: number) => <InputNumber defaultValue={v} size="small" style={{ width: 80 }} />,
    },
    {
      title: 'Major', dataIndex: 'major', key: 'major', width: 120,
      render: (v: number) => <InputNumber defaultValue={v} size="small" style={{ width: 80 }} />,
    },
    {
      title: 'Critical', dataIndex: 'critical', key: 'critical', width: 120,
      render: (v: number) => <InputNumber defaultValue={v} size="small" style={{ width: 80 }} />,
    },
    {
      title: 'Active', dataIndex: 'active', key: 'active', width: 80,
      render: (v: boolean) => <Switch defaultChecked={v} size="small" />,
    },
  ];

  const thresholdsTab = (
    <Card title="Compliance Thresholds">
      <Table<ThresholdRow>
        dataSource={thresholds}
        columns={thresholdColumns}
        pagination={false}
        size="small"
      />
      <div style={{ marginTop: 16 }}>
        <Button type="primary" icon={<Save size={14} />} onClick={handleSaveSettings} loading={savePending}>Save Thresholds</Button>
      </div>
    </Card>
  );

  // -- Admin Users Tab ------------------------------------------------------
  const userColumns: ColumnsType<AdminUser> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 160 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
    {
      title: 'Role', dataIndex: 'role', key: 'role', width: 120,
      render: (role: string) => <Tag color={role === 'Super Admin' ? 'red' : role === 'Admin' ? 'blue' : 'green'}>{role}</Tag>,
    },
    { title: 'Last Login', dataIndex: 'lastLogin', key: 'lastLogin', width: 160 },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => <Badge status={s === 'active' ? 'success' : 'default'} text={s === 'active' ? 'Active' : 'Inactive'} />,
    },
    {
      title: 'Actions', key: 'actions', width: 140,
      render: () => (
        <Space>
          <Button type="link" size="small" icon={<Pencil size={14} />}>Edit</Button>
          <Button type="link" size="small" danger icon={<Trash2 size={14} />}>Remove</Button>
        </Space>
      ),
    },
  ];

  const usersTab = (
    <Card title="Admin Users">
      <Table<AdminUser>
        dataSource={adminUsers}
        columns={userColumns}
        pagination={false}
        size="small"
      />
    </Card>
  );

  // -- Integrations Tab -----------------------------------------------------
  const integrationsTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {MOCK_INTEGRATIONS.map((integration) => {
        const st = INTEGRATION_STATUS[integration.status];
        return (
          <Card key={integration.name} size="small">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{integration.name}</div>
                <Badge color={st.color} text={st.label} />
                <div style={{ marginTop: 4, color: '#8c8c8c', fontSize: 12, fontFamily: 'monospace' }}>{integration.endpoint}</div>
              </div>
              <Button icon={<TestTube size={14} />}>Test Connection</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );

  // -- Notifications Tab ----------------------------------------------------
  const notifColumns: ColumnsType<NotificationTemplate> = [
    { title: 'Event', dataIndex: 'event', key: 'event', width: 200 },
    {
      title: 'Email', dataIndex: 'email', key: 'email', width: 80,
      render: (v: boolean) => <Switch defaultChecked={v} size="small" />,
    },
    {
      title: 'SMS', dataIndex: 'sms', key: 'sms', width: 80,
      render: (v: boolean) => <Switch defaultChecked={v} size="small" />,
    },
    { title: 'Interval', dataIndex: 'interval', key: 'interval', width: 160 },
  ];

  const notificationsTab = (
    <Card title="Notification Templates">
      <Table<NotificationTemplate>
        dataSource={MOCK_NOTIFICATIONS}
        columns={notifColumns}
        pagination={false}
        size="small"
      />
    </Card>
  );

  // -- Data Retention Tab ---------------------------------------------------
  const retentionColumns: ColumnsType<RetentionRow> = [
    { title: 'Entity Type', dataIndex: 'entityType', key: 'entityType', width: 160 },
    { title: 'Retention Period', dataIndex: 'retentionPeriod', key: 'retentionPeriod', width: 140 },
    {
      title: 'Auto-Purge', dataIndex: 'autoPurge', key: 'autoPurge', width: 100,
      render: (v: boolean) => <Switch defaultChecked={v} size="small" />,
    },
    { title: 'Last Purge', dataIndex: 'lastPurge', key: 'lastPurge', width: 140 },
  ];

  const retentionTab = (
    <Card title="Data Retention Policies">
      <Table<RetentionRow>
        dataSource={MOCK_RETENTION}
        columns={retentionColumns}
        pagination={false}
        size="small"
      />
    </Card>
  );

  // -- Render ---------------------------------------------------------------
  return (
    <NctsPageContainer title="System Settings">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'general', label: 'General', children: generalTab },
          { key: 'thresholds', label: 'Compliance Thresholds', children: thresholdsTab },
          { key: 'users', label: 'Admin Users', children: usersTab },
          { key: 'integrations', label: 'Integrations', children: integrationsTab },
          { key: 'notifications', label: 'Notifications', children: notificationsTab },
          { key: 'retention', label: 'Data Retention', children: retentionTab },
        ]}
      />
    </NctsPageContainer>
  );
}
