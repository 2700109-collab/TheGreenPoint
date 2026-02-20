import { Card, Col, Row, Statistic, Typography, Table, Tag } from 'antd';
import {
  ExperimentOutlined,
  EnvironmentOutlined,
  SwapOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

/** Placeholder data — will be replaced with API calls in Phase 2 */
const stats = [
  { title: 'Active Plants', value: 1247, icon: <ExperimentOutlined />, color: '#007A4D' },
  { title: 'Facilities', value: 3, icon: <EnvironmentOutlined />, color: '#1B3A5C' },
  { title: 'Pending Transfers', value: 5, icon: <SwapOutlined />, color: '#FFB81C' },
  { title: 'Compliance', value: '98%', icon: <CheckCircleOutlined />, color: '#52C41A' },
];

const recentActivity = [
  { key: '1', action: 'Plant Registered', item: 'NCTS-ZA-2026-001234', date: '2026-02-20', status: 'success' },
  { key: '2', action: 'Harvest Created', item: 'BATCH-2026-000089', date: '2026-02-19', status: 'success' },
  { key: '3', action: 'Transfer Sent', item: 'TXF-2026-000045', date: '2026-02-18', status: 'pending' },
  { key: '4', action: 'Lab Result', item: 'BATCH-2026-000087', date: '2026-02-17', status: 'pass' },
];

const columns = [
  { title: 'Action', dataIndex: 'action', key: 'action' },
  {
    title: 'Item',
    dataIndex: 'item',
    key: 'item',
    render: (text: string) => <span className="tracking-id">{text}</span>,
  },
  { title: 'Date', dataIndex: 'date', key: 'date' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        success: 'green',
        pending: 'gold',
        pass: 'cyan',
        fail: 'red',
      };
      return <Tag color={colorMap[status] || 'default'}>{status.toUpperCase()}</Tag>;
    },
  },
];

export default function DashboardPage() {
  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>
      <Row gutter={[16, 16]}>
        {stats.map((stat) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>
      <Card title="Recent Activity" style={{ marginTop: 24 }}>
        <Table columns={columns} dataSource={recentActivity} pagination={false} size="small" />
      </Card>
    </div>
  );
}
