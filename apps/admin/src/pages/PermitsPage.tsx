import { useState } from 'react';
import { Typography, Table, Tag, Select, Space, Spin, Alert } from 'antd';
import { usePermits } from '@ncts/api-client';
import type { Permit } from '@ncts/shared-types';

const { Title } = Typography;

const permitTypeLabels: Record<string, string> = {
  sahpra_22a: 'SAHPRA §22A',
  sahpra_22c: 'SAHPRA §22C',
  dalrrd_hemp: 'DALRRD Hemp',
  dtic_processing: 'DTIC Processing',
};

const statusColors: Record<string, string> = {
  active: 'green',
  expired: 'red',
  suspended: 'orange',
  pending: 'gold',
  revoked: 'volcano',
};

const columns = [
  {
    title: 'Permit #',
    dataIndex: 'permitNumber',
    key: 'permitNumber',
    render: (t: string) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{t}</span>,
  },
  {
    title: 'Operator',
    key: 'operator',
    render: (_: unknown, r: any) => r.tenant?.name ?? '—',
  },
  {
    title: 'Type',
    dataIndex: 'permitType',
    key: 'permitType',
    render: (t: string) => permitTypeLabels[t] || t,
  },
  {
    title: 'Facility',
    key: 'facility',
    render: (_: unknown, r: any) => r.facility?.name ?? '—',
  },
  {
    title: 'Issued',
    dataIndex: 'issueDate',
    key: 'issueDate',
    render: (d: string) => new Date(d).toLocaleDateString('en-ZA'),
  },
  {
    title: 'Expires',
    dataIndex: 'expiryDate',
    key: 'expiryDate',
    render: (d: string) => new Date(d).toLocaleDateString('en-ZA'),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (s: string) => (
      <Tag color={statusColors[s] || 'default'}>{s.toUpperCase()}</Tag>
    ),
  },
];

export default function PermitsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const { data, isLoading, error } = usePermits({ page, limit: 20, status: statusFilter, permitType: typeFilter });

  if (error) return <Alert type="error" message="Failed to load permits" showIcon />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 0 }}>Permits</Title>
        <Space>
          <Select
            placeholder="Filter by type"
            allowClear
            style={{ width: 200 }}
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            options={[
              { value: 'sahpra_22a', label: 'SAHPRA §22A' },
              { value: 'sahpra_22c', label: 'SAHPRA §22C' },
              { value: 'dalrrd_hemp', label: 'DALRRD Hemp' },
              { value: 'dtic_processing', label: 'DTIC Processing' },
            ]}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'expired', label: 'Expired' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
        </Space>
      </div>
      <Spin spinning={isLoading}>
        <Table<Permit>
          columns={columns}
          dataSource={data?.data}
          rowKey="id"
          pagination={{
            current: data?.meta?.page ?? 1,
            pageSize: data?.meta?.limit ?? 20,
            total: data?.meta?.total ?? 0,
            onChange: (p) => setPage(p),
          }}
        />
      </Spin>
    </div>
  );
}
