import { useState } from 'react';
import { Typography, Button, Table, Tag, Spin, Alert } from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import { useSales } from '@ncts/api-client';
import type { Sale } from '@ncts/shared-types';

const { Title } = Typography;

const columns = [
  {
    title: 'Sale #',
    dataIndex: 'saleNumber',
    key: 'saleNumber',
    render: (t: string) => <span style={{ fontFamily: 'monospace' }}>{t}</span>,
  },
  {
    title: 'Quantity',
    dataIndex: 'quantityGrams',
    key: 'quantityGrams',
    render: (g: number) => `${g}g`,
  },
  {
    title: 'Price (ZAR)',
    dataIndex: 'priceZar',
    key: 'priceZar',
    render: (p: number) => `R ${p.toFixed(2)}`,
  },
  {
    title: 'Date',
    dataIndex: 'saleDate',
    key: 'saleDate',
    render: (d: string) => new Date(d).toLocaleDateString('en-ZA'),
  },
  {
    title: 'Verified',
    dataIndex: 'customerVerified',
    key: 'customerVerified',
    render: (v: boolean) => (
      <Tag color={v ? 'green' : 'orange'}>{v ? 'VERIFIED' : 'UNVERIFIED'}</Tag>
    ),
  },
];

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useSales({ page, limit: 20 });

  if (error) return <Alert type="error" message="Failed to load sales" showIcon />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 0 }}>
          <DollarOutlined style={{ marginRight: 8 }} />
          Sales
        </Title>
        <Button type="primary" icon={<PlusOutlined />}>Record Sale</Button>
      </div>
      <Spin spinning={isLoading}>
        <Table<Sale>
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
