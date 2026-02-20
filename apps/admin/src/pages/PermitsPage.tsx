import { Typography, Table, Tag, Select, Space } from 'antd';

const { Title } = Typography;

const permits = [
  { key: '1', number: 'SAHPRA-22A-2026-0042', operator: 'GreenFields Cultivation', type: 'SAHPRA §22A', issued: '2025-06-01', expires: '2026-06-01', status: 'active' },
  { key: '2', number: 'DALRRD-HEMP-2025-0118', operator: 'Hemp SA Holdings', type: 'DALRRD Hemp', issued: '2025-03-15', expires: '2026-03-15', status: 'active' },
  { key: '3', number: 'SAHPRA-22C-2025-0011', operator: 'Cape Cannabis Co.', type: 'SAHPRA §22C', issued: '2024-12-01', expires: '2025-12-01', status: 'expired' },
  { key: '4', number: 'DTIC-IND-2026-0007', operator: 'KZN Botanicals', type: 'DTIC Processing', issued: '2026-01-20', expires: '2027-01-20', status: 'active' },
];

const columns = [
  { title: 'Permit #', dataIndex: 'number', key: 'number', render: (t: string) => <span className="permit-number">{t}</span> },
  { title: 'Operator', dataIndex: 'operator', key: 'operator' },
  { title: 'Type', dataIndex: 'type', key: 'type' },
  { title: 'Issued', dataIndex: 'issued', key: 'issued' },
  { title: 'Expires', dataIndex: 'expires', key: 'expires' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (s: string) => {
      const colors: Record<string, string> = { active: 'green', expired: 'red', suspended: 'orange', pending: 'gold' };
      return <Tag color={colors[s] || 'default'}>{s.toUpperCase()}</Tag>;
    },
  },
];

export default function PermitsPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 0 }}>Permits</Title>
        <Space>
          <Select placeholder="Filter by type" allowClear style={{ width: 200 }}
            options={[
              { value: 'sahpra_22a', label: 'SAHPRA §22A' },
              { value: 'sahpra_22c', label: 'SAHPRA §22C' },
              { value: 'dalrrd_hemp', label: 'DALRRD Hemp' },
              { value: 'dtic_processing', label: 'DTIC Processing' },
            ]}
          />
          <Select placeholder="Filter by status" allowClear style={{ width: 150 }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'expired', label: 'Expired' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
        </Space>
      </div>
      <Table columns={columns} dataSource={permits} />
    </div>
  );
}
