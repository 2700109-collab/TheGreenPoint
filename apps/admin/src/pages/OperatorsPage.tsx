import { Typography, Table, Tag, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Title } = Typography;

const operators = [
  { key: '1', name: 'GreenFields Cultivation (Pty) Ltd', province: 'WC', permits: 2, plants: 1247, compliance: 'compliant' },
  { key: '2', name: 'Hemp SA Holdings', province: 'GP', permits: 1, plants: 3200, compliance: 'compliant' },
  { key: '3', name: 'Green Valley Holdings', province: 'LP', permits: 1, plants: 450, compliance: 'non_compliant' },
  { key: '4', name: 'Cape Cannabis Co.', province: 'WC', permits: 3, plants: 1800, compliance: 'warning' },
  { key: '5', name: 'KZN Botanicals', province: 'KZN', permits: 2, plants: 2100, compliance: 'compliant' },
];

const columns = [
  { title: 'Operator', dataIndex: 'name', key: 'name' },
  { title: 'Province', dataIndex: 'province', key: 'province' },
  { title: 'Permits', dataIndex: 'permits', key: 'permits' },
  { title: 'Plants', dataIndex: 'plants', key: 'plants' },
  {
    title: 'Compliance',
    dataIndex: 'compliance',
    key: 'compliance',
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
  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>Operators</Title>
      <Input
        placeholder="Search operators..."
        prefix={<SearchOutlined />}
        style={{ width: 300, marginBottom: 16 }}
      />
      <Table columns={columns} dataSource={operators} />
    </div>
  );
}
