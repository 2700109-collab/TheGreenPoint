import { Typography, Button, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const harvests = [
  { key: '1', batchNumber: 'BATCH-2026-000089', facility: 'GreenFields Farm', plants: 50, wetWeight: '12500g', dryWeight: '3200g', date: '2026-02-19', status: 'complete' },
  { key: '2', batchNumber: 'BATCH-2026-000088', facility: 'GreenFields Farm', plants: 30, wetWeight: '8000g', dryWeight: '2100g', date: '2026-02-15', status: 'complete' },
  { key: '3', batchNumber: 'BATCH-2026-000087', facility: 'GreenFields Farm', plants: 25, wetWeight: '6500g', dryWeight: null, date: '2026-02-10', status: 'drying' },
];

const columns = [
  { title: 'Batch #', dataIndex: 'batchNumber', key: 'batchNumber', render: (t: string) => <span className="batch-number">{t}</span> },
  { title: 'Facility', dataIndex: 'facility', key: 'facility' },
  { title: 'Plants', dataIndex: 'plants', key: 'plants' },
  { title: 'Wet Weight', dataIndex: 'wetWeight', key: 'wetWeight' },
  { title: 'Dry Weight', dataIndex: 'dryWeight', key: 'dryWeight', render: (t: string | null) => t || '—' },
  { title: 'Date', dataIndex: 'date', key: 'date' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (s: string) => <Tag color={s === 'complete' ? 'green' : 'blue'}>{s.toUpperCase()}</Tag>,
  },
];

export default function HarvestsPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 0 }}>Harvests</Title>
        <Button type="primary" icon={<PlusOutlined />}>Record Harvest</Button>
      </div>
      <Table columns={columns} dataSource={harvests} />
    </div>
  );
}
