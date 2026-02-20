import { Typography, Table, Tag, Spin, Alert, Card, Row, Col, Statistic } from 'antd';
import {
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useFacilitiesGeo } from '@ncts/api-client';

const { Title, Text } = Typography;

const complianceColors: Record<string, string> = {
  compliant: 'green',
  warning: 'orange',
  non_compliant: 'red',
};

const columns = [
  { title: 'Name', dataIndex: ['properties', 'name'], key: 'name' },
  { title: 'Operator', dataIndex: ['properties', 'operator'], key: 'operator' },
  { title: 'Type', dataIndex: ['properties', 'facilityType'], key: 'facilityType' },
  { title: 'Province', dataIndex: ['properties', 'province'], key: 'province' },
  { title: 'Plants', dataIndex: ['properties', 'plantCount'], key: 'plantCount' },
  { title: 'Permits', dataIndex: ['properties', 'permitCount'], key: 'permitCount' },
  {
    title: 'Compliance',
    dataIndex: ['properties', 'complianceStatus'],
    key: 'complianceStatus',
    render: (s: string) => (
      <Tag color={complianceColors[s] || 'default'}>
        {s?.replace('_', ' ').toUpperCase() ?? 'UNKNOWN'}
      </Tag>
    ),
  },
  {
    title: 'Coordinates',
    key: 'coords',
    render: (_: unknown, record: any) => (
      <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
        {record.properties?.latitude?.toFixed(4)}, {record.properties?.longitude?.toFixed(4)}
      </Text>
    ),
  },
];

export default function FacilitiesMapPage() {
  const { data, isLoading, error } = useFacilitiesGeo();

  if (error) return <Alert type="error" message="Failed to load facility geographic data" showIcon />;

  const features = (data as any)?.features ?? [];
  const compliantCount = features.filter((f: any) => f.properties?.complianceStatus === 'compliant').length;
  const nonCompliantCount = features.filter((f: any) => f.properties?.complianceStatus !== 'compliant').length;
  const totalPlants = features.reduce((sum: number, f: any) => sum + (f.properties?.plantCount ?? 0), 0);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>Facility Map & Locations</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Facilities"
              value={features.length}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#1B3A5C' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Compliant"
              value={compliantCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Flagged"
              value={nonCompliantCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: nonCompliantCount > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="All Licensed Facilities"
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            Interactive Mapbox GL map will be integrated in Phase 5
          </Text>
        }
      >
        <Spin spinning={isLoading}>
          <Table
            columns={columns}
            dataSource={features}
            rowKey={(record: any) => record.properties?.id}
            pagination={{ pageSize: 20 }}
          />
        </Spin>
        <Card size="small" style={{ marginTop: 16, background: '#f0f5ff', border: '1px dashed #adc6ff' }}>
          <Row gutter={16}>
            <Col span={24}>
              <Text strong>Total Plants Across All Facilities: </Text>
              <Text style={{ color: '#007A4D', fontWeight: 600 }}>{totalPlants}</Text>
            </Col>
          </Row>
        </Card>
      </Card>
    </div>
  );
}
