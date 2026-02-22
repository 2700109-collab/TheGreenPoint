/**
 * AuditLogPage — Full audit log with 7-year POPIA retention.
 * Per FrontEnd.md §4.7.
 */

import { useRef, useState } from 'react';
import { Card, Descriptions, Drawer, Tag, Typography } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
import { InfoIcon } from 'lucide-react';
import {
  TrackingId,
  NctsPageContainer,
  CsvExportButton,
} from '@ncts/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'login' | 'export';

interface AuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  description: string;
  ipAddress: string;
}

// ---------------------------------------------------------------------------
// Action → Tag colour
// ---------------------------------------------------------------------------

const ACTION_COLOR: Record<AuditAction, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  view: 'default',
  login: 'purple',
  export: 'cyan',
};

// ---------------------------------------------------------------------------
// Mock Data — TODO: Replace with API hooks
// ---------------------------------------------------------------------------

const MOCK_AUDIT: AuditEntry[] = [
  { id: 'aud-1', timestamp: '2026-02-21T09:12:00Z', actorName: 'Thabo Nkosi', actorRole: 'Admin', action: 'create', entity: 'Operator', entityId: 'OPR-20260221-GPC', description: 'Created new operator registration for GreenPoint Cannabis', ipAddress: '196.21.45.***' },
  { id: 'aud-2', timestamp: '2026-02-21T08:45:00Z', actorName: 'Lerato Dlamini', actorRole: 'Inspector', action: 'update', entity: 'Facility', entityId: 'FAC-20260115-CPT', description: 'Updated facility inspection status to compliant', ipAddress: '41.13.122.***' },
  { id: 'aud-3', timestamp: '2026-02-20T16:30:00Z', actorName: 'Sipho Mabaso', actorRole: 'Admin', action: 'delete', entity: 'Plant', entityId: 'PLT-20260118-DES', description: 'Destroyed plant batch — failed lab test', ipAddress: '105.225.88.***' },
  { id: 'aud-4', timestamp: '2026-02-20T14:10:00Z', actorName: 'Naledi Mokoena', actorRole: 'Auditor', action: 'view', entity: 'Transfer', entityId: 'TRF-20260210-KZN', description: 'Viewed transfer manifest for KZN shipment', ipAddress: '102.65.33.***' },
  { id: 'aud-5', timestamp: '2026-02-20T11:00:00Z', actorName: 'System', actorRole: 'System', action: 'login', entity: 'User', entityId: 'USR-THABO-001', description: 'Successful login from Johannesburg office', ipAddress: '196.21.45.***' },
  { id: 'aud-6', timestamp: '2026-02-19T17:20:00Z', actorName: 'Lerato Dlamini', actorRole: 'Inspector', action: 'export', entity: 'Report', entityId: 'RPT-20260219-MON', description: 'Exported monthly compliance report as PDF', ipAddress: '41.13.122.***' },
  { id: 'aud-7', timestamp: '2026-02-19T10:15:00Z', actorName: 'Thabo Nkosi', actorRole: 'Admin', action: 'update', entity: 'Permit', entityId: 'PRM-20260105-ACT', description: 'Renewed cultivation permit for GreenLeaf Holdings', ipAddress: '196.21.45.***' },
  { id: 'aud-8', timestamp: '2026-02-18T15:40:00Z', actorName: 'Naledi Mokoena', actorRole: 'Auditor', action: 'create', entity: 'Batch', entityId: 'BAT-20260218-HRV', description: 'Registered new harvest batch from Mpumalanga facility', ipAddress: '102.65.33.***' },
  { id: 'aud-9', timestamp: '2026-02-18T09:30:00Z', actorName: 'Sipho Mabaso', actorRole: 'Admin', action: 'update', entity: 'Operator', entityId: 'OPR-20250412-HVG', description: 'Suspended operator due to compliance violations', ipAddress: '105.225.88.***' },
  { id: 'aud-10', timestamp: '2026-02-17T13:55:00Z', actorName: 'System', actorRole: 'System', action: 'export', entity: 'Report', entityId: 'RPT-20260217-INCB', description: 'Automated INCB annual report generation', ipAddress: '10.0.0.***' },
];

// ---------------------------------------------------------------------------
// CSV columns
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { key: 'timestamp', header: 'Timestamp' },
  { key: 'actorName', header: 'Actor' },
  { key: 'action', header: 'Action' },
  { key: 'entity', header: 'Entity' },
  { key: 'entityId', header: 'Entity ID' },
  { key: 'description', header: 'Description' },
];

// ---------------------------------------------------------------------------
// Mask IP last octet
// ---------------------------------------------------------------------------

function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }
  return ip;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Mock before/after diffs for update actions */
const MOCK_DIFFS: Record<string, { before: Record<string, unknown>; after: Record<string, unknown> }> = {
  'aud-2': {
    before: { inspectionStatus: 'pending', lastInspected: '2026-01-15' },
    after: { inspectionStatus: 'compliant', lastInspected: '2026-02-21' },
  },
  'aud-7': {
    before: { status: 'expiring', expiryDate: '2026-03-01' },
    after: { status: 'active', expiryDate: '2028-01-05' },
  },
  'aud-9': {
    before: { operatorStatus: 'active', complianceScore: 64 },
    after: { operatorStatus: 'suspended', complianceScore: 64, suspendedReason: 'Compliance violations' },
  },
};

export default function AuditLogPage() {
  const actionRef = useRef<ActionType>(undefined);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const columns: ProColumns<AuditEntry>[] = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      width: 160,
      valueType: 'dateTimeRange',
      render: (_, r) => (
        <span style={{ fontSize: 13 }}>{dayjs(r.timestamp).format('DD MMM YYYY HH:mm')}</span>
      ),
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
    },
    {
      title: 'Actor',
      dataIndex: 'actorName',
      width: 160,
      render: (_, r) => (
        <span>
          {r.actorName}{' '}
          <Tag style={{ marginLeft: 4 }}>{r.actorRole}</Tag>
        </span>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 150,
      valueEnum: {
        create: { text: 'Create' },
        update: { text: 'Update' },
        delete: { text: 'Delete' },
        view: { text: 'View' },
        login: { text: 'Login' },
        export: { text: 'Export' },
      },
      render: (_, r) => (
        <Tag color={ACTION_COLOR[r.action]}>
          {r.action.charAt(0).toUpperCase() + r.action.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Entity',
      dataIndex: 'entity',
      width: 100,
      render: (_, r) => <Tag>{r.entity}</Tag>,
    },
    {
      title: 'Entity ID',
      dataIndex: 'entityId',
      width: 180,
      render: (_, r) => <TrackingId id={r.entityId} size="sm" copyable />,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: 300,
      ellipsis: true,
      search: false,
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      width: 130,
      search: false,
      render: (_, r) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{maskIp(r.ipAddress)}</span>,
    },
  ];

  return (
    <NctsPageContainer
      title="Audit Log"
      subTitle="7-year retention per POPIA"
      extra={
        <CsvExportButton
          data={MOCK_AUDIT}
          columns={CSV_COLUMNS}
          filename="audit-log-export"
        />
      }
    >
      <Card
        size="small"
        style={{
          marginBottom: 16,
          background: '#e6f4ff',
          border: '1px solid #91caff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoIcon size={16} style={{ color: '#1677ff', flexShrink: 0 }} />
          <span style={{ color: '#0958d9' }}>
            Audit records are retained for 7 years per POPIA and regulatory requirements.
          </span>
        </div>
      </Card>

      <ProTable<AuditEntry>
        actionRef={actionRef}
        columns={columns}
        dataSource={MOCK_AUDIT}
        rowKey="id"
        search={{ filterType: 'light' }}
        options={{ density: true, fullScreen: true, reload: true, setting: true }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} entries`,
        }}
        toolBarRender={false}
        scroll={{ x: 1280 }}
        dateFormatter="string"
        headerTitle={undefined}
        onRow={(record) => ({
          onClick: () => setSelectedEntry(record),
          style: { cursor: 'pointer' },
        })}
      />

      {/* ---- Audit Detail Drawer ---- */}
      <Drawer
        title={selectedEntry ? `Audit Entry — ${selectedEntry.id}` : 'Audit Detail'}
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        width={560}
      >
        {selectedEntry && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Timestamp">{dayjs(selectedEntry.timestamp).format('DD MMM YYYY HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="Actor">{selectedEntry.actorName} ({selectedEntry.actorRole})</Descriptions.Item>
              <Descriptions.Item label="Action"><Tag color={ACTION_COLOR[selectedEntry.action]}>{selectedEntry.action}</Tag></Descriptions.Item>
              <Descriptions.Item label="Entity">{selectedEntry.entity}</Descriptions.Item>
              <Descriptions.Item label="Entity ID"><TrackingId id={selectedEntry.entityId} size="sm" copyable /></Descriptions.Item>
              <Descriptions.Item label="Description">{selectedEntry.description}</Descriptions.Item>
              <Descriptions.Item label="IP Address">{maskIp(selectedEntry.ipAddress)}</Descriptions.Item>
            </Descriptions>

            {MOCK_DIFFS[selectedEntry.id] && (
              <Card title="Change Diff" size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong style={{ color: '#cf1322' }}>Before</Typography.Text>
                    <pre style={{ background: '#fff1f0', padding: 12, borderRadius: 6, fontSize: 12, marginTop: 4, overflow: 'auto' }}>
                      {JSON.stringify(MOCK_DIFFS[selectedEntry.id]!.before, null, 2)}
                    </pre>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong style={{ color: '#389e0d' }}>After</Typography.Text>
                    <pre style={{ background: '#f6ffed', padding: 12, borderRadius: 6, fontSize: 12, marginTop: 4, overflow: 'auto' }}>
                      {JSON.stringify(MOCK_DIFFS[selectedEntry.id]!.after, null, 2)}
                    </pre>
                  </div>
                </div>
              </Card>
            )}

            <Card title="Related Audit Entries" size="small">
              {MOCK_AUDIT.filter((e) => e.entityId === selectedEntry.entityId && e.id !== selectedEntry.id).length > 0 ? (
                MOCK_AUDIT.filter((e) => e.entityId === selectedEntry.entityId && e.id !== selectedEntry.id).map((e) => (
                  <div
                    key={e.id}
                    style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                    onClick={() => setSelectedEntry(e)}
                  >
                    <Tag color={ACTION_COLOR[e.action]}>{e.action}</Tag>
                    <span style={{ fontSize: 13 }}>{e.description}</span>
                    <span style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 8 }}>{dayjs(e.timestamp).fromNow()}</span>
                  </div>
                ))
              ) : (
                <Typography.Text type="secondary">No related entries found.</Typography.Text>
              )}
            </Card>
          </>
        )}
      </Drawer>
    </NctsPageContainer>
  );
}
