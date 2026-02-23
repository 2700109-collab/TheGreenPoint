/**
 * AuditLogPage — Full audit log with 7-year POPIA retention.
 * Per FrontEnd.md §4.7.
 */

import { useRef, useState } from 'react';
import { Card, Descriptions, Drawer, Spin, Tag, Typography } from 'antd';
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
import { useAuditLog } from '@ncts/api-client';

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
// Mock Data DELETED — now using useAuditLog() hook
// ---------------------------------------------------------------------------

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
  const { data: auditResponse, isLoading } = useAuditLog();

  const auditEntries: AuditEntry[] = (auditResponse?.data ?? auditResponse ?? []).map((e: any) => ({
    id: e.id,
    timestamp: e.timestamp,
    actorName: e.actorName ?? (`${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.userId || 'System'),
    actorRole: e.actorRole ?? e.role ?? 'System',
    action: (e.action ?? 'view') as AuditAction,
    entity: e.entityType ?? e.entity ?? '',
    entityId: e.entityId ?? '',
    description: e.description ?? (e.details as any)?.description ?? '',
    ipAddress: e.ipAddress ?? '',
  }));

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

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
          data={auditEntries}
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
        dataSource={auditEntries}
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
              {auditEntries.filter((e) => e.entityId === selectedEntry.entityId && e.id !== selectedEntry.id).length > 0 ? (
                auditEntries.filter((e) => e.entityId === selectedEntry.entityId && e.id !== selectedEntry.id).map((e) => (
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
