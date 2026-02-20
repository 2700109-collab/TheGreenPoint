import { useState } from 'react';
import { Table, Tag, Spin } from 'antd';
import { useLabResults } from '@ncts/api-client';

const statusColors: Record<string, string> = { pass: 'green', fail: 'red', pending: 'gold', conditional: 'orange' };

const columns = [
  { title: 'Lab', dataIndex: 'labName', key: 'lab' },
  { title: 'Test Date', dataIndex: 'testDate', key: 'date', render: (d: string) => new Date(d).toLocaleDateString('en-ZA') },
  { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColors[s]}>{s.toUpperCase()}</Tag> },
  { title: 'THC %', dataIndex: 'thcPercent', key: 'thc', render: (v: number) => `${v}%` },
  { title: 'CBD %', dataIndex: 'cbdPercent', key: 'cbd', render: (v: number) => `${v}%` },
  { title: 'Pesticides', dataIndex: 'pesticidesPass', key: 'pest', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'PASS' : 'FAIL'}</Tag> },
  { title: 'Heavy Metals', dataIndex: 'heavyMetalsPass', key: 'metals', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'PASS' : 'FAIL'}</Tag> },
];

export default function LabResultsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLabResults({ page, limit: 20 } as any);

  return (
    <div>
      <div className="page-header"><h2>Lab Results</h2></div>
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
