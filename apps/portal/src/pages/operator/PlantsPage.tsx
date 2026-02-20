import { useState } from 'react';
import { Table, Tag, Spin, Select, Space } from 'antd';
import { usePlants } from '@ncts/api-client';
import type { Plant } from '@ncts/shared-types';

const stateColors: Record<string, string> = { seed: 'default', seedling: 'lime', vegetative: 'green', flowering: 'gold', harvested: 'blue', destroyed: 'red' };

const columns = [
  { title: 'Tracking ID', dataIndex: 'trackingId', key: 'trackingId', render: (t: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{t}</span> },
  { title: 'State', dataIndex: 'state', key: 'state', render: (s: string) => <Tag color={stateColors[s]}>{s.toUpperCase()}</Tag> },
  { title: 'Planted', dataIndex: 'plantedDate', key: 'planted', render: (d: string) => new Date(d).toLocaleDateString('en-ZA') },
  { title: 'Facility', key: 'facility', render: (_: unknown, r: any) => r.facility?.name ?? '—' },
  { title: 'Zone', key: 'zone', render: (_: unknown, r: any) => r.zone?.name ?? '—' },
  { title: 'Strain', key: 'strain', render: (_: unknown, r: any) => r.strain?.name ?? '—' },
];

export default function PlantsPage() {
  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState<string | undefined>();
  const { data, isLoading } = usePlants({ page, limit: 20, state: stateFilter } as any);

  return (
    <div>
      <div className="page-header">
        <h2>Plants</h2>
        <Space>
          <Select placeholder="Filter by state" allowClear style={{ width: 160 }} value={stateFilter}
            onChange={(v) => { setStateFilter(v); setPage(1); }}
            options={['seed', 'seedling', 'vegetative', 'flowering', 'harvested', 'destroyed'].map(s => ({ value: s, label: s.toUpperCase() }))}
          />
        </Space>
      </div>
      <div className="content-card" style={{ padding: 0 }}>
        <Spin spinning={isLoading}>
          <Table<Plant> columns={columns} dataSource={data?.data} rowKey="id"
            pagination={{ current: data?.meta?.page ?? 1, pageSize: 20, total: data?.meta?.total ?? 0, onChange: setPage, showSizeChanger: false }}
          />
        </Spin>
      </div>
    </div>
  );
}
