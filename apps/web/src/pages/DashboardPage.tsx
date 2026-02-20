import { Card, Col, Row, Statistic, Typography, Table, Tag, Spin, Alert } from 'antd';
import {
  ExperimentOutlined,
  EnvironmentOutlined,
  SwapOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useFacilities, usePlants, useTransfers } from '@ncts/api-client';

const { Title } = Typography;

const activityColumns = [
  { title: 'Action', dataIndex: 'action', key: 'action' },
  {
    title: 'Item',
    dataIndex: 'item',
    key: 'item',
    render: (text: string) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
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
        accepted: 'green',
        rejected: 'red',
        pass: 'cyan',
        fail: 'red',
      };
      return <Tag color={colorMap[status] || 'default'}>{status.toUpperCase()}</Tag>;
    },
  },
];

export default function DashboardPage() {
  const { data: plantsData, isLoading: plantsLoading, error: plantsError } = usePlants({ page: 1, limit: 1 });
  const { data: facilitiesData, isLoading: facilitiesLoading, error: facilitiesError } = useFacilities({ page: 1, limit: 1 });
  const { data: transfersData, isLoading: transfersLoading, error: transfersError } = useTransfers({ page: 1, limit: 5 });

  const isLoading = plantsLoading || facilitiesLoading || transfersLoading;
  const anyError = plantsError || facilitiesError || transfersError;

  const totalPlants = plantsData?.meta?.total ?? 0;
  const totalFacilities = facilitiesData?.meta?.total ?? 0;
  const pendingTransfers = transfersData?.data?.filter((t) => t.status === 'pending').length ?? 0;

  const stats = [
    { title: 'Active Plants', value: totalPlants, icon: <ExperimentOutlined />, color: '#007A4D' },
    { title: 'Facilities', value: totalFacilities, icon: <EnvironmentOutlined />, color: '#1B3A5C' },
    { title: 'Pending Transfers', value: pendingTransfers, icon: <SwapOutlined />, color: '#FFB81C' },
    { title: 'Compliance', value: '98%', icon: <CheckCircleOutlined />, color: '#52C41A' },
  ];

  const recentActivity = (transfersData?.data ?? []).slice(0, 4).map((t, i) => ({
    key: String(i),
    action: 'Transfer',
    item: t.transferNumber,
    date: new Date(t.initiatedAt).toLocaleDateString('en-ZA'),
    status: t.status,
  }));

  if (anyError) {
    return <Alert type="warning" message="Could not load dashboard data. Is the API running on port 3000?" showIcon />;
  }

  return (
    <Spin spinning={isLoading}>
      <Title level={3} style={{ marginBottom: 24 }}>Dashboard</Title>
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
        <Table columns={activityColumns} dataSource={recentActivity} pagination={false} size="small" />
      </Card>
    </Spin>
  );
}
