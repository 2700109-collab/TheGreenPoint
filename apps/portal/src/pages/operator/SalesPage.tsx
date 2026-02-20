import { useState } from 'react';
import { Table, Tag, Spin } from 'antd';
import { useSales } from '@ncts/api-client';

const columns = [
  { title: 'Sale #', dataIndex: 'saleNumber', key: 'num', render: (t: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{t}</span> },
  { title: 'Date', dataIndex: 'saleDate', key: 'date', render: (d: string) => new Date(d).toLocaleDateString('en-ZA') },
  { title: 'Quantity (g)', dataIndex: 'quantityGrams', key: 'qty', render: (v: number) => `${v?.toLocaleString()}g` },
  { title: 'Price (ZAR)', dataIndex: 'priceZar', key: 'price', render: (v: number) => `R ${v?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` },
  { title: 'Verified', dataIndex: 'customerVerified', key: 'verified', render: (v: boolean) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Yes' : 'No'}</Tag> },
];

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSales({ page, limit: 20 } as any);

  return (
    <div>
      <div className="page-header"><h2>Sales</h2></div>
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
