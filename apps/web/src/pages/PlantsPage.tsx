import { useState } from 'react';
import { Typography, Button, Table, Tag, Space, Select, Spin, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { usePlants } from '@ncts/api-client';
import type { Plant, PlantState } from '@ncts/shared-types';

const { Title } = Typography;

const stateColors: Record<string, string> = {
  seed: 'default',
  seedling: 'lime',
  vegetative: 'green',
  flowering: 'purple',
  harvested: 'gold',
  destroyed: 'red',
};

const columns = [
  {
    title: 'Tracking ID',
    dataIndex: 'trackingId',
    key: 'trackingId',
    render: (text: string) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
  },
  { title: 'Strain', dataIndex: 'strainId', key: 'strainId', ellipsis: true },
  { title: 'Zone', dataIndex: 'zoneId', key: 'zoneId', ellipsis: true },
  {
    title: 'State',
    dataIndex: 'state',
    key: 'state',
    render: (state: string) => (
      <Tag color={stateColors[state] || 'default'}>{state.toUpperCase()}</Tag>
    ),
  },
  {
    title: 'Planted',
    dataIndex: 'plantedDate',
    key: 'plantedDate',
    render: (d: string) => new Date(d).toLocaleDateString('en-ZA'),
  },
];

export default function PlantsPage() {
  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState<PlantState | undefined>();

  const { data, isLoading, error } = usePlants({
    page,
    limit: 20,
    state: stateFilter,
  });

  if (error) return <Alert type="error" message="Failed to load plants" showIcon />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 0 }}>Plants</Title>
        <Space>
          <Select
            placeholder="Filter by state"
            allowClear
            style={{ width: 180 }}
            value={stateFilter}
            onChange={(val) => { setStateFilter(val); setPage(1); }}
            options={Object.keys(stateColors).map((s) => ({
              value: s,
              label: s.charAt(0).toUpperCase() + s.slice(1),
            }))}
          />
          <Button type="primary" icon={<PlusOutlined />}>Register Plant</Button>
        </Space>
      </div>
      <Spin spinning={isLoading}>
        <Table<Plant>
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
