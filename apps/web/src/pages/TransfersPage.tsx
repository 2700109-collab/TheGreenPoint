import { Typography, Button, Table, Tag, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const outgoing = [
  { key: '1', transferNumber: 'TXF-2026-000045', receiver: 'Cape Cannabis Retail', items: 2, weight: '500g', date: '2026-02-18', status: 'pending' },
  { key: '2', transferNumber: 'TXF-2026-000044', receiver: 'SA Cannabis Labs', items: 1, weight: '50g', date: '2026-02-16', status: 'accepted' },
];

const incoming = [
  { key: '1', transferNumber: 'TXF-2026-000043', sender: 'Premium Genetics SA', items: 3, weight: '1200g', date: '2026-02-15', status: 'delivered' },
];

const columns = (directionField: string) => [
  { title: 'Transfer #', dataIndex: 'transferNumber', key: 'transferNumber', render: (t: string) => <span className="tracking-id">{t}</span> },
  { title: directionField === 'receiver' ? 'Receiver' : 'Sender', dataIndex: directionField, key: directionField },
  { title: 'Items', dataIndex: 'items', key: 'items' },
  { title: 'Weight', dataIndex: 'weight', key: 'weight' },
  { title: 'Date', dataIndex: 'date', key: 'date' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (s: string) => {
      const colors: Record<string, string> = { pending: 'gold', accepted: 'green', rejected: 'red', delivered: 'blue', in_transit: 'cyan' };
      return <Tag color={colors[s] || 'default'}>{s.toUpperCase()}</Tag>;
    },
  },
];

export default function TransfersPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 0 }}>Transfers</Title>
        <Button type="primary" icon={<PlusOutlined />}>Initiate Transfer</Button>
      </div>
      <Tabs
        defaultActiveKey="outgoing"
        items={[
          {
            key: 'outgoing',
            label: 'Outgoing',
            children: <Table columns={columns('receiver')} dataSource={outgoing} />,
          },
          {
            key: 'incoming',
            label: 'Incoming',
            children: <Table columns={columns('sender')} dataSource={incoming} />,
          },
        ]}
      />
    </div>
  );
}
