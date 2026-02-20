import { useState } from 'react';
import { Typography, Button, Table, Tag, Spin, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useBatches } from '@ncts/api-client';
import type { Batch } from '@ncts/shared-types';

const { Title } = Typography;

const columns = [
  {
    title: 'Batch #',
    dataIndex: 'batchNumber',
    key: 'batchNumber',
    render: (t: string) => <span style={{ fontFamily: 'monospace' }}>{t}</span>,
  },
  { title: 'Type', dataIndex: 'batchType', key: 'batchType', render: (t: string) => t.charAt(0).toUpperCase() + t.slice(1) },
  { title: 'Plants', dataIndex: 'plantCount', key: 'plantCount' },
  {
    title: 'Wet Weight',
    dataIndex: 'wetWeightGrams',
    key: 'wetWeightGrams',
    render: (w: number | null) => (w ? `${w.toLocaleString()}g` : '—'),
  },
  {
    title: 'Dry Weight',
    dataIndex: 'dryWeightGrams',
    key: 'dryWeightGrams',
    render: (w: number | null) => (w ? `${w.toLocaleString()}g` : '—'),
  },
  {
    title: 'Date',
    dataIndex: 'createdDate',
    key: 'createdDate',
    render: (d: string) => new Date(d).toLocaleDateString('en-ZA'),
  },
  {
    title: 'Lab Result',
    dataIndex: 'labResultId',
    key: 'labResultId',
    render: (id: string | null) => (
      <Tag color={id ? 'green' : 'default'}>{id ? 'TESTED' : 'PENDING'}</Tag>
    ),
  },
];

export default function HarvestsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useBatches({ page, limit: 20 });

  if (error) return <Alert type="error" message="Failed to load batches" showIcon />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 0 }}>Harvests &amp; Batches</Title>
        <Button type="primary" icon={<PlusOutlined />}>Record Harvest</Button>
      </div>
      <Spin spinning={isLoading}>
        <Table<Batch>
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
