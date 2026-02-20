import { useState } from 'react';
import { Typography, Button, Table, Tag, Tabs, Spin, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTransfers } from '@ncts/api-client';
import type { Transfer } from '@ncts/shared-types';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  pending: 'gold',
  accepted: 'green',
  rejected: 'red',
  delivered: 'blue',
  in_transit: 'cyan',
};

const columns = [
  {
    title: 'Transfer #',
    dataIndex: 'transferNumber',
    key: 'transferNumber',
    render: (t: string) => <span style={{ fontFamily: 'monospace' }}>{t}</span>,
  },
  { title: 'Items', key: 'items', render: (_: unknown, r: Transfer) => r.items?.length ?? 0 },
  {
    title: 'Date',
    dataIndex: 'initiatedAt',
    key: 'initiatedAt',
    render: (d: string) => new Date(d).toLocaleDateString('en-ZA'),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (s: string) => <Tag color={statusColors[s] || 'default'}>{s.toUpperCase()}</Tag>,
  },
  {
    title: 'Vehicle',
    dataIndex: 'vehicleRegistration',
    key: 'vehicleRegistration',
    render: (v: string | null) => v || '—',
  },
];

export default function TransfersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useTransfers({ page, limit: 20 });

  if (error) return <Alert type="error" message="Failed to load transfers" showIcon />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 0 }}>Transfers</Title>
        <Button type="primary" icon={<PlusOutlined />}>Initiate Transfer</Button>
      </div>
      <Spin spinning={isLoading}>
        <Tabs
          defaultActiveKey="all"
          items={[
            {
              key: 'all',
              label: 'All Transfers',
              children: (
                <Table<Transfer>
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
              ),
            },
          ]}
        />
      </Spin>
    </div>
  );
}
