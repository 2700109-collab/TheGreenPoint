import { useState } from 'react';
import { Typography, Table, Tag, Spin, Alert, Card, Row, Col, Statistic } from 'antd';
import {
  WarningOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useComplianceAlerts, useRegulatoryDashboard } from '@ncts/api-client';
import type { ComplianceAlert } from '@ncts/api-client';

const { Title } = Typography;

const severityColors: Record<string, string> = {
  critical: 'red',
  warning: 'orange',
  info: 'blue',
};

const typeLabels: Record<string, string> = {
  expired_permit: 'Expired Permit',
  permit_expiring: 'Permit Expiring',
  non_compliant_operator: 'Non-Compliant Operator',
  lab_test_failure: 'Lab Test Failure',
};

const columns = [
  {
    title: 'Severity',
    dataIndex: 'severity',
    key: 'severity',
    width: 100,
    render: (s: string) => (
      <Tag color={severityColors[s] || 'default'} icon={s === 'critical' ? <CloseCircleOutlined /> : <WarningOutlined />}>
        {s.toUpperCase()}
      </Tag>
    ),
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    render: (t: string) => typeLabels[t] || t,
  },
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'Operator', dataIndex: 'operatorName', key: 'operatorName' },
  { title: 'Facility', dataIndex: 'facilityName', key: 'facilityName' },
  {
    title: 'Date',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (d: string) => new Date(d).toLocaleDateString('en-ZA'),
  },
];

export default function CompliancePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useComplianceAlerts({ page, limit: 20 });
  const { data: dashboard } = useRegulatoryDashboard();

  if (error) return <Alert type="error" message="Failed to load compliance alerts" showIcon />;

  const criticalCount = data?.data?.filter((a) => a.severity === 'critical').length ?? 0;
  const warningCount = data?.data?.filter((a) => a.severity === 'warning').length ?? 0;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>Compliance Monitoring</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Compliance Rate"
              value={dashboard?.complianceRate ?? 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: (dashboard?.complianceRate ?? 0) >= 80 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Critical Alerts"
              value={criticalCount}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: criticalCount > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Warnings"
              value={warningCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: warningCount > 0 ? '#faad14' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Active Compliance Alerts">
        <Spin spinning={isLoading}>
          <Table<ComplianceAlert>
            columns={columns}
            dataSource={data?.data}
            rowKey="id"
            pagination={{
              current: data?.meta?.page ?? 1,
              pageSize: data?.meta?.limit ?? 20,
              total: data?.meta?.total ?? 0,
              onChange: (p) => setPage(p),
            }}
          />
        </Spin>
      </Card>
    </div>
  );
}
