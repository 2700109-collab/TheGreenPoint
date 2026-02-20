import { useState } from 'react';
import { Table, Spin } from 'antd';
import { useHarvests } from '@ncts/api-client';

const columns = [
  { title: 'Batch', key: 'batch', render: (_: unknown, r: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.batch?.batchNumber ?? r.batchId}</span> },
  { title: 'Harvest Date', dataIndex: 'harvestDate', key: 'date', render: (d: string) => new Date(d).toLocaleDateString('en-ZA') },
  { title: 'Wet Weight (g)', dataIndex: 'wetWeightGrams', key: 'wet', render: (v: number) => v?.toLocaleString() ?? '—' },
  { title: 'Dry Weight (g)', dataIndex: 'dryWeightGrams', key: 'dry', render: (v: number | null) => v?.toLocaleString() ?? 'Pending' },
  { title: 'Plant Count', dataIndex: 'plantIds', key: 'plants', render: (ids: string[]) => ids?.length ?? 0 },
];

export default function HarvestsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHarvests({ page, limit: 20 });

  return (
    <div>
      <div className="page-header"><h2>Harvests</h2></div>
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
