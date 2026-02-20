import { Card, Col, Row, Statistic, Typography, Alert, Table, Spin } from 'antd';
import {
  TeamOutlined,
  ExperimentOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useRegulatoryDashboard } from '@ncts/api-client';

const { Title, Paragraph } = Typography;

const flagColumns = [
  { title: 'Type', dataIndex: 'type', key: 'type' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'Operator', dataIndex: 'operatorName', key: 'operatorName' },
  {
    title: 'Time',
    dataIndex: 'timestamp',
    key: 'timestamp',
    render: (t: string) => new Date(t).toLocaleDateString('en-ZA'),
  },
];

export default function NationalDashboard() {
  const { data, isLoading, error } = useRegulatoryDashboard();

  if (error) {
    return <Alert type="error" message="Failed to load dashboard. Is the API running?" showIcon />;
  }

  const kpis = [
    { title: 'Licensed Operators', value: data?.totalOperators ?? 0, icon: <TeamOutlined />, color: '#1B3A5C' },
    { title: 'Total Plants', value: data?.totalPlants ?? 0, icon: <ExperimentOutlined />, color: '#007A4D' },
    { title: 'Active Facilities', value: data?.totalFacilities ?? 0, icon: <EnvironmentOutlined />, color: '#1890FF' },
    { title: 'Active Permits', value: data?.activePermits ?? 0, icon: <SafetyCertificateOutlined />, color: '#722ed1' },
    { title: 'Compliance Rate', value: data ? `${data.complianceRate.toFixed(1)}%` : '—', icon: <CheckCircleOutlined />, color: '#52C41A' },
    { title: 'Flagged Operators', value: data?.flaggedOperators ?? 0, icon: <WarningOutlined />, color: '#FF4D4F' },
  ];

  return (
    <Spin spinning={isLoading}>
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

      <Card title="Recent Activity" style={{ marginTop: 24 }}>
        <Table
          columns={flagColumns}
          dataSource={(data?.recentActivity ?? []).map((a) => ({ ...a, key: a.id }))}
          pagination={false}
          size="small"
        />
      </Card>
    </Spin>
  );
}
