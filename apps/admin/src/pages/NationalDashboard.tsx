import { Card, Col, Row, Statistic, Typography, Alert, Table, Tag } from 'antd';
import {
  TeamOutlined,
  ExperimentOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const kpis = [
  { title: 'Licensed Operators', value: 142, icon: <TeamOutlined />, color: '#1B3A5C' },
  { title: 'Total Plants', value: 48_392, icon: <ExperimentOutlined />, color: '#007A4D' },
  { title: 'Active Facilities', value: 215, icon: <EnvironmentOutlined />, color: '#1890FF' },
  { title: 'Active Permits', value: 198, icon: <SafetyCertificateOutlined />, color: '#722ed1' },
  { title: 'Compliance Rate', value: '94.2%', icon: <CheckCircleOutlined />, color: '#52C41A' },
  { title: 'Flagged Operators', value: 8, icon: <WarningOutlined />, color: '#FF4D4F' },
];

const flagged = [
  { key: '1', operator: 'Green Valley Holdings', issue: 'Expired permit', severity: 'high', since: '2026-02-10' },
  { key: '2', operator: 'Cape Cannabis Co.', issue: 'Inventory discrepancy', severity: 'medium', since: '2026-02-15' },
  { key: '3', operator: 'Limpopo Growers', issue: 'Missing lab results', severity: 'low', since: '2026-02-18' },
];

const flagColumns = [
  { title: 'Operator', dataIndex: 'operator', key: 'operator' },
  { title: 'Issue', dataIndex: 'issue', key: 'issue' },
  {
    title: 'Severity',
    dataIndex: 'severity',
    key: 'severity',
    render: (s: string) => {
      const colors: Record<string, string> = { high: 'red', medium: 'orange', low: 'gold' };
      return <Tag color={colors[s]}>{s.toUpperCase()}</Tag>;
    },
  },
  { title: 'Since', dataIndex: 'since', key: 'since' },
];

export default function NationalDashboard() {
  return (
    <div>
      <Title level={3}>National Overview</Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Real-time cannabis industry monitoring across South Africa
      </Paragraph>

      <Alert
        message="Map View Coming in Phase 3"
        description="A geospatial map showing all licensed facilities color-coded by compliance status will be rendered here using Mapbox GL."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]}>
        {kpis.map((kpi) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={kpi.title}>
            <Card>
              <Statistic
                title={kpi.title}
                value={kpi.value}
                prefix={kpi.icon}
                valueStyle={{ color: kpi.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Flagged Operators" style={{ marginTop: 24 }}>
        <Table columns={flagColumns} dataSource={flagged} pagination={false} size="small" />
      </Card>
    </div>
  );
}
