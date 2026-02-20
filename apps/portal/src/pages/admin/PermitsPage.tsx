import { useState } from 'react';
import { Table, Tag, Spin, Select, Space } from 'antd';
import { usePermits } from '@ncts/api-client';
import type { Permit } from '@ncts/shared-types';

const permitTypeLabels: Record<string, string> = { sahpra_22a: 'SAHPRA §22A', sahpra_22c: 'SAHPRA §22C', dalrrd_hemp: 'DALRRD Hemp', dtic_processing: 'DTIC Processing' };
const statusColors: Record<string, string> = { active: 'green', expired: 'red', suspended: 'orange', pending: 'gold', revoked: 'volcano' };

const columns = [
  { title: 'Permit #', dataIndex: 'permitNumber', key: 'num', render: (t: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{t}</span> },
  { title: 'Operator', key: 'operator', render: (_: unknown, r: any) => r.tenant?.name ?? '—' },
  { title: 'Type', dataIndex: 'permitType', key: 'type', render: (t: string) => permitTypeLabels[t] || t },
  { title: 'Issued', dataIndex: 'issueDate', key: 'issued', render: (d: string) => new Date(d).toLocaleDateString('en-ZA') },
  { title: 'Expires', dataIndex: 'expiryDate', key: 'expires', render: (d: string) => new Date(d).toLocaleDateString('en-ZA') },
  { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColors[s]}>{s.toUpperCase()}</Tag> },
];

export default function PermitsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const { data, isLoading } = usePermits({ page, limit: 20, status: statusFilter, permitType: typeFilter });

  return (
    <div>
      <div className="page-header">
        <h2>Permits</h2>
        <Space>
          <Select placeholder="Type" allowClear style={{ width: 160 }} value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            options={Object.entries(permitTypeLabels).map(([k, v]) => ({ value: k, label: v }))} />
          <Select placeholder="Status" allowClear style={{ width: 140 }} value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={['active', 'pending', 'suspended', 'expired', 'revoked'].map(s => ({ value: s, label: s.toUpperCase() }))} />
        </Space>
      </div>
      <div className="content-card" style={{ padding: 0 }}>
        <Spin spinning={isLoading}>
          <Table<Permit> columns={columns} dataSource={data?.data} rowKey="id"
            pagination={{ current: data?.meta?.page ?? 1, pageSize: 20, total: data?.meta?.total ?? 0, onChange: setPage, showSizeChanger: false }}
          />
        </Spin>
      </div>
    </div>
  );
}
