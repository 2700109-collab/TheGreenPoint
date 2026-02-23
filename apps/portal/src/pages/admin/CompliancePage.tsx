/**
 * CompliancePage — National regulatory compliance monitoring dashboard.
 * Per FrontEnd.md §4.4.
 */

import { useRef } from 'react';
import { Card, Row, Col, Tag, Progress, Statistic, Typography, Dropdown, Button, Space, Badge, Spin } from 'antd';
import type { MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Calendar, MoreVertical } from 'lucide-react';
import {
  NctsPageContainer,
  DataFreshness,
  CHART_COLORS,
} from '@ncts/ui';
import { Line } from '@ant-design/charts';
import { useComplianceAlerts, useComplianceAverage } from '@ncts/api-client';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'critical' | 'major' | 'minor';
type AlertStatus = 'open' | 'investigating' | 'resolved';

interface ComplianceAlert {
  id: string;
  severity: Severity;
  operator: string;
  alertType: string;
  triggered: string;
  status: AlertStatus;
  assignedTo: string;
}

// ---------------------------------------------------------------------------
// Severity + Status colour maps
// ---------------------------------------------------------------------------

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#f5222d',
  major: '#fa8c16',
  minor: '#fadb14',
};

const STATUS_TAG: Record<AlertStatus, { color: string; label: string }> = {
  open: { color: 'red', label: 'Open' },
  investigating: { color: 'orange', label: 'Investigating' },
  resolved: { color: 'green', label: 'Resolved' },
};

// ---------------------------------------------------------------------------
// 12-month trend data
// ---------------------------------------------------------------------------

const MONTHLY_TREND = [
  { month: 'Mar', value: 88 },
  { month: 'Apr', value: 89 },
  { month: 'May', value: 91 },
  { month: 'Jun', value: 90 },
  { month: 'Jul', value: 92 },
  { month: 'Aug', value: 93 },
  { month: 'Sep', value: 91 },
  { month: 'Oct', value: 94 },
  { month: 'Nov', value: 92 },
  { month: 'Dec', value: 93 },
  { month: 'Jan', value: 91 },
  { month: 'Feb', value: 92 },
];

// ---------------------------------------------------------------------------
// Mock Alerts DELETED — now using useComplianceAlerts() hook
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ProTable columns
// ---------------------------------------------------------------------------

const columns: ProColumns<ComplianceAlert>[] = [
  {
    title: 'Severity',
    dataIndex: 'severity',
    width: 80,
    filters: true,
    valueEnum: { critical: { text: 'Critical' }, major: { text: 'Major' }, minor: { text: 'Minor' } },
    render: (_, r) => (
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: SEVERITY_COLOR[r.severity],
        }}
        title={r.severity}
      />
    ),
  },
  {
    title: 'Operator',
    dataIndex: 'operator',
    width: 180,
    render: (_, r) => (
      <a style={{ fontWeight: 500 }}>{r.operator}</a>
    ),
  },
  {
    title: 'Alert Type',
    dataIndex: 'alertType',
    width: 200,
    ellipsis: true,
  },
  {
    title: 'Triggered',
    dataIndex: 'triggered',
    width: 120,
    sorter: (a, b) => dayjs(a.triggered).unix() - dayjs(b.triggered).unix(),
    render: (_, r) => <Text type="secondary">{dayjs(r.triggered).fromNow()}</Text>,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    width: 120,
    filters: true,
    valueEnum: { open: { text: 'Open' }, investigating: { text: 'Investigating' }, resolved: { text: 'Resolved' } },
    render: (_, r) => {
      const s = STATUS_TAG[r.status];
      return <Tag color={s.color}>{s.label}</Tag>;
    },
  },
  {
    title: 'Assigned To',
    dataIndex: 'assignedTo',
    width: 150,
  },
  {
    title: 'Actions',
    valueType: 'option',
    width: 100,
    render: (_, r) => {
      const items: MenuProps['items'] = [
        { key: 'investigate', label: 'Investigate' },
        { key: 'dismiss', label: 'Dismiss' },
        { key: 'escalate', label: 'Escalate', danger: true },
      ];
      return (
        <Dropdown menu={{ items, onClick: ({ key }) => console.log(key, r.id) }} trigger={['click']}>
          <Button type="text" size="small" icon={<MoreVertical size={16} />} />
        </Dropdown>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Distribution bar helper
// ---------------------------------------------------------------------------

function DistributionRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <Text style={{ width: 60, flexShrink: 0 }}>{label}</Text>
      <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 24, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <Text style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>{count} operators ({pct}%)</Text>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompliancePage() {
  const actionRef = useRef<ActionType>(undefined);
  const { data: alertsResponse, isLoading: alertsLoading } = useComplianceAlerts({ limit: 50 });
  const { data: complianceAvgResponse, isLoading: avgLoading } = useComplianceAverage();

  const isLoading = alertsLoading || avgLoading;

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  const rawAlerts = alertsResponse?.data?.data ?? alertsResponse?.data ?? [];
  const alerts: ComplianceAlert[] = rawAlerts.map((a: any) => ({
    id: a.id,
    severity: a.severity === 'warning' ? 'major' : a.severity === 'info' ? 'minor' : (a.severity ?? 'minor') as Severity,
    operator: a.operatorName ?? a.operator ?? '',
    alertType: a.type ?? a.alertType ?? a.description ?? '',
    triggered: a.createdAt ?? a.triggered ?? '',
    status: a.status ?? 'open',
    assignedTo: a.assignedTo ?? 'Unassigned',
  }));

  const avgData = complianceAvgResponse?.data ?? complianceAvgResponse;
  const complianceAvg = (avgData as any)?.average ?? 92;

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const majorCount = alerts.filter((a) => a.severity === 'major').length;
  const minorCount = alerts.filter((a) => a.severity === 'minor').length;
  const activeAlertsCount = alerts.filter((a) => a.status !== 'resolved').length;

  const totalOperators = 42 + 68 + 17; // static distribution pending endpoint

  return (
    <NctsPageContainer
      title="Compliance Overview"
      subTitle="National regulatory compliance monitoring"
      extra={<DataFreshness lastUpdated={new Date().toISOString()} />}
    >
      {/* ---- Overview Row ---- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* National Average */}
        <Col xs={24} xl={8}>
          <Card style={{ textAlign: 'center', height: '100%' }}>
            <Title level={5} style={{ marginBottom: 16 }}>National Average</Title>
            <Progress
              type="circle"
              percent={complianceAvg}
              strokeColor="#52c41a"
              format={(pct) => <span style={{ fontSize: 28, fontWeight: 700 }}>{pct}%</span>}
              size={140}
            />
            <Statistic
              value={complianceAvg}
              suffix="/ 100"
              style={{ marginTop: 12 }}
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
            />
          </Card>
        </Col>

        {/* Active Alerts */}
        <Col xs={24} xl={8}>
          <Badge count={activeAlertsCount} offset={[-6, 6]}>
            <Card style={{ height: '100%', minWidth: 260 }}>
              <Title level={5} style={{ marginBottom: 16 }}>Active Alerts</Title>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f5222d', display: 'inline-block' }} />
                  <Text>Critical</Text>
                  <Text strong style={{ marginLeft: 'auto' }}>{criticalCount}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fadb14', display: 'inline-block' }} />
                  <Text>Major</Text>
                  <Text strong style={{ marginLeft: 'auto' }}>{majorCount}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1890ff', display: 'inline-block' }} />
                  <Text>Minor</Text>
                  <Text strong style={{ marginLeft: 'auto' }}>{minorCount}</Text>
                </div>
              </Space>
            </Card>
          </Badge>
        </Col>

        {/* Inspections Due */}
        <Col xs={24} xl={8}>
          <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Calendar size={28} color="#1890ff" />
              <Title level={5} style={{ margin: 0 }}>Inspections Due</Title>
            </div>
            <Statistic value={8} suffix="this month" valueStyle={{ fontSize: 28 }} />
            <Text type="secondary" style={{ marginTop: 4 }}>Next: 3 days</Text>
          </Card>
        </Col>
      </Row>

      {/* ---- Compliance Distribution ---- */}
      <Card title="Compliance Distribution" style={{ marginBottom: 24 }}>
        <DistributionRow label="≥ 95%" count={42} total={totalOperators} color="#52c41a" />
        <DistributionRow label="80–94%" count={68} total={totalOperators} color="#faad14" />
        <DistributionRow label="< 80%" count={17} total={totalOperators} color="#f5222d" />
      </Card>

      {/* ---- 12-Month Compliance Trend (Line chart) ---- */}
      <Card title="12-Month Compliance Trend" style={{ marginBottom: 24 }}>
        <Line
          theme="ncts"
          data={MONTHLY_TREND}
          xField="month"
          yField="value"
          smooth={true}
          height={260}
          point={{ size: 4, shape: 'circle' }}
          axis={{ y: { title: 'Compliance %' } }}
          style={{ lineWidth: 2 }}
          annotations={[
            { type: 'lineY' as const, data: [95], style: { stroke: CHART_COLORS[3], lineDash: [4, 4] } },
          ]}
        />
      </Card>

      {/* ---- Active Alerts Table ---- */}
      <ProTable<ComplianceAlert>
        headerTitle="Active Alerts"
        actionRef={actionRef}
        columns={columns}
        dataSource={alerts}
        rowKey="id"
        search={{ filterType: 'light' }}
        pagination={{ pageSize: 10 }}
        options={{ density: true, reload: () => actionRef.current?.reload() }}
        dateFormatter="string"
      />
    </NctsPageContainer>
  );
}
