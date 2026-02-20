import { Typography, Button, Table, Tag, Space, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

/** Placeholder data */
const plants = [
  { key: '1', trackingId: 'NCTS-ZA-2026-001234', strain: 'Durban Poison', zone: 'Zone A', state: 'flowering', plantedDate: '2026-01-15' },
  { key: '2', trackingId: 'NCTS-ZA-2026-001235', strain: 'Swazi Gold', zone: 'Zone A', state: 'vegetative', plantedDate: '2026-01-20' },
  { key: '3', trackingId: 'NCTS-ZA-2026-001236', strain: 'Malawi Gold', zone: 'Zone B', state: 'seedling', plantedDate: '2026-02-01' },
  { key: '4', trackingId: 'NCTS-ZA-2026-001237', strain: 'Durban Poison', zone: 'Zone C', state: 'harvested', plantedDate: '2025-11-10' },
  { key: '5', trackingId: 'NCTS-ZA-2026-001238', strain: 'Rooibaard', zone: 'Zone A', state: 'seed', plantedDate: '2026-02-18' },
];

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
    render: (text: string) => <span className="tracking-id">{text}</span>,
  },
  { title: 'Strain', dataIndex: 'strain', key: 'strain' },
  { title: 'Zone', dataIndex: 'zone', key: 'zone' },
  {
    title: 'State',
    dataIndex: 'state',
    key: 'state',
    render: (state: string) => (
      <Tag color={stateColors[state] || 'default'}>{state.toUpperCase()}</Tag>
    ),
  },
  { title: 'Planted', dataIndex: 'plantedDate', key: 'plantedDate' },
];

export default function PlantsPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 0 }}>
          Plants
        </Title>
        <Space>
          <Select
            placeholder="Filter by state"
            allowClear
            style={{ width: 180 }}
            options={Object.keys(stateColors).map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
          />
          <Button type="primary" icon={<PlusOutlined />}>
            Register Plant
          </Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={plants} />
    </div>
  );
}
