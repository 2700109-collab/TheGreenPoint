import { Typography, Button, Table, Tag, Space } from 'antd';
import { PlusOutlined, EnvironmentOutlined } from '@ant-design/icons';

const { Title } = Typography;

/** Placeholder data */
const facilities = [
  {
    key: '1',
    name: 'GreenFields Farm',
    type: 'Cultivation',
    province: 'Western Cape',
    zones: 4,
    plants: 800,
    status: 'active',
  },
  {
    key: '2',
    name: 'Cape Processing Hub',
    type: 'Processing',
    province: 'Western Cape',
    zones: 2,
    plants: 0,
    status: 'active',
  },
  {
    key: '3',
    name: 'Durban Distribution',
    type: 'Distribution',
    province: 'KwaZulu-Natal',
    zones: 1,
    plants: 0,
    status: 'pending',
  },
];

const columns = [
  {
    title: 'Facility',
    dataIndex: 'name',
    key: 'name',
    render: (text: string) => (
      <Space>
        <EnvironmentOutlined />
        {text}
      </Space>
    ),
  },
  { title: 'Type', dataIndex: 'type', key: 'type' },
  { title: 'Province', dataIndex: 'province', key: 'province' },
  { title: 'Zones', dataIndex: 'zones', key: 'zones' },
  { title: 'Plants', dataIndex: 'plants', key: 'plants' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={status === 'active' ? 'green' : 'gold'}>{status.toUpperCase()}</Tag>
    ),
  },
];

export default function FacilitiesPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 0 }}>
          Facilities
        </Title>
        <Button type="primary" icon={<PlusOutlined />}>
          Register Facility
        </Button>
      </div>
      <Table columns={columns} dataSource={facilities} />
    </div>
  );
}
