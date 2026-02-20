import { useState } from 'react';
import { Table, Tag, Spin } from 'antd';
import { useTransfers } from '@ncts/api-client';

const statusColors: Record<string, string> = { pending: 'gold', in_transit: 'blue', delivered: 'cyan', accepted: 'green', rejected: 'red', cancelled: 'default' };

const columns = [
  { title: 'Transfer #', dataIndex: 'transferNumber', key: 'num', render: (t: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{t}</span> },
  { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColors[s]}>{s.replace('_', ' ').toUpperCase()}</Tag> },
  { title: 'Initiated', dataIndex: 'initiatedAt', key: 'date', render: (d: string) => new Date(d).toLocaleDateString('en-ZA') },
  { title: 'Vehicle', dataIndex: 'vehicleRegistration', key: 'vehicle', render: (v: string | null) => v ?? '—' },
  { title: 'Driver', dataIndex: 'driverName', key: 'driver', render: (v: string | null) => v ?? '—' },
];

export default function TransfersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransfers({ page, limit: 20 } as any);

  return (
    <div>
      <div className="page-header"><h2>Transfers</h2></div>
      <div className="content-card" style={{ padding: 0 }}>
        <Spin spinning={isLoading}>
          <Table columns={columns} dataSource={data?.data ?? []} rowKey="id"
            pagination={{ current: data?.meta?.page ?? 1, pageSize: 20, total: data?.meta?.total ?? 0, onChange: setPage, showSizeChanger: false }}
          />
        </Spin>
      </div>
    </div>
  );
}
