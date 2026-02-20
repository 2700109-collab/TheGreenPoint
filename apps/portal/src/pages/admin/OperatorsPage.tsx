import { Spin } from 'antd';
import { Table, Tag } from 'antd';
import { useOperators } from '@ncts/api-client';

const statusColors: Record<string, string> = { compliant: 'green', warning: 'orange', non_compliant: 'red', under_review: 'blue' };

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', render: (t: string) => <span style={{ fontWeight: 500 }}>{t}</span> },
  { title: 'Trading Name', dataIndex: 'tradingName', key: 'trading' },
  { title: 'Registration #', dataIndex: 'registrationNumber', key: 'reg', render: (t: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{t}</span> },
  { title: 'Province', dataIndex: 'province', key: 'province' },
  { title: 'B-BBEE', dataIndex: 'bbbeeLevel', key: 'bbbee', render: (v: number | null) => v ? `Level ${v}` : '—' },
  { title: 'Compliance', dataIndex: 'complianceStatus', key: 'status', render: (s: string) => <Tag color={statusColors[s]}>{s.replace('_', ' ').toUpperCase()}</Tag> },
  { title: 'Active', dataIndex: 'isActive', key: 'active', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
];

export default function OperatorsPage() {
  const { data, isLoading } = useOperators();

  return (
    <div>
      <div className="page-header"><h2>Licensed Operators</h2></div>
      <div className="content-card" style={{ padding: 0 }}>
        <Spin spinning={isLoading}>
          <Table columns={columns} dataSource={(data as any) ?? []} rowKey="id" pagination={{ pageSize: 20 }} />
        </Spin>
      </div>
    </div>
  );
}
