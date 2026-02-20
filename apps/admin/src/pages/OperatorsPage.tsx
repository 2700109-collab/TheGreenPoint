import { useState } from 'react';
import { Typography, Table, Tag, Input, Spin, Alert } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useOperators } from '@ncts/api-client';
import type { Tenant } from '@ncts/shared-types';

const { Title } = Typography;

const columns = [
  { title: 'Operator', dataIndex: 'name', key: 'name' },
  { title: 'Trading Name', dataIndex: 'tradingName', key: 'tradingName' },
  { title: 'Province', dataIndex: 'province', key: 'province' },
  { title: 'B-BBEE Level', dataIndex: 'bbbeeLevel', key: 'bbbeeLevel', render: (l: number | null) => l ?? '—' },
  { title: 'Contact', dataIndex: 'contactEmail', key: 'contactEmail' },
  {
    title: 'Compliance',
    dataIndex: 'complianceStatus',
    key: 'complianceStatus',
    render: (c: string) => {
      const map: Record<string, { color: string; label: string }> = {
        compliant: { color: 'green', label: 'COMPLIANT' },
        warning: { color: 'orange', label: 'WARNING' },
        non_compliant: { color: 'red', label: 'NON-COMPLIANT' },
      };
      const item = map[c] || { color: 'default', label: c };
      return <Tag color={item.color}>{item.label}</Tag>;
    },
  },
];

export default function OperatorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useOperators({ page, limit: 20 });

  const filtered = data?.data?.filter((op) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return op.name.toLowerCase().includes(q) || op.tradingName?.toLowerCase().includes(q);
  });

  if (error) return <Alert type="error" message="Failed to load operators" showIcon />;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>Operators</Title>
      <Input
        placeholder="Search operators..."
        prefix={<SearchOutlined />}
        style={{ width: 300, marginBottom: 16 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Spin spinning={isLoading}>
        <Table<Tenant>
          columns={columns}
          dataSource={filtered}
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
