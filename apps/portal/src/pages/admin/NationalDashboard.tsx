/**
 * §4.1 National Overview Dashboard
 *
 * Top-level dashboard for NCTS administrators showing KPIs, facility map
 * placeholder, supply-chain flow, compliance by province, and recent activity.
 *
 * TODO: Replace all mock data with live API calls once endpoints are ready.
 */

import { Card, Col, Row, Spin, Table, Tag, Timeline, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Users,
  FileCheck,
  Sprout,
  Truck,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { NctsPageContainer, DataFreshness, StatCard, CHART_COLORS } from '@ncts/ui';
import { Pie, Column as ColumnChart } from '@ant-design/charts';
import {
  useRegulatoryDashboard,
  useRegulatoryTrends,
  useComplianceAlerts,
} from '@ncts/api-client';

// ---------------------------------------------------------------------------
// Static chart data (no backend endpoint yet)
// ---------------------------------------------------------------------------

/** Province abbreviations and facility counts for the map summary bar */
const PROVINCE_FACILITIES: { abbr: string; count: number; color: string }[] = [
  { abbr: 'WC', count: 45, color: 'green' },
  { abbr: 'GP', count: 38, color: 'blue' },
  { abbr: 'KZN', count: 22, color: 'cyan' },
  { abbr: 'EC', count: 15, color: 'geekblue' },
  { abbr: 'FS', count: 8, color: 'purple' },
  { abbr: 'LP', count: 12, color: 'magenta' },
  { abbr: 'MP', count: 10, color: 'volcano' },
  { abbr: 'NW', count: 7, color: 'orange' },
  { abbr: 'NC', count: 3, color: 'gold' },
];

/** Supply chain Column chart data (static — no endpoint yet) */
const SUPPLY_CHAIN_DATA = [
  { stage: 'Cultivated', count: 18456 },
  { stage: 'Tested', count: 14230 },
  { stage: 'Transferred', count: 12421 },
  { stage: 'Sold', count: 9842 },
];

/** Plant lifecycle donut chart data (static — no endpoint yet) */
const LIFECYCLE_DATA = [
  { type: 'Seedling', value: 3200 },
  { type: 'Vegetative', value: 5800 },
  { type: 'Flowering', value: 4500 },
  { type: 'Harvested', value: 3200 },
  { type: 'Destroyed', value: 1756 },
];

/** Compliance-by-province table data (static — no endpoint yet) */
interface ProvinceCompliance {
  key: string;
  province: string;
  operators: number;
  avgScore: number;
  activeAlerts: number;
}

const PROVINCE_COMPLIANCE: ProvinceCompliance[] = [
  { key: 'WC', province: 'Western Cape', operators: 45, avgScore: 96, activeAlerts: 2 },
  { key: 'GP', province: 'Gauteng', operators: 38, avgScore: 91, activeAlerts: 5 },
  { key: 'KZN', province: 'KwaZulu-Natal', operators: 22, avgScore: 88, activeAlerts: 3 },
  { key: 'EC', province: 'Eastern Cape', operators: 15, avgScore: 85, activeAlerts: 4 },
  { key: 'FS', province: 'Free State', operators: 8, avgScore: 93, activeAlerts: 1 },
  { key: 'LP', province: 'Limpopo', operators: 12, avgScore: 79, activeAlerts: 6 },
  { key: 'MP', province: 'Mpumalanga', operators: 10, avgScore: 90, activeAlerts: 2 },
  { key: 'NW', province: 'North West', operators: 7, avgScore: 82, activeAlerts: 3 },
  { key: 'NC', province: 'Northern Cape', operators: 3, avgScore: 97, activeAlerts: 0 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a Progress bar stroke colour based on compliance threshold */
function scoreColor(score: number): string {
  if (score >= 90) return '#52C41A';
  if (score >= 75) return '#D48806';
  return '#FF4D4F';
}

/** Alert count badge colour */
function alertColor(count: number): string {
  if (count === 0) return '#52C41A';
  if (count <= 2) return '#D48806';
  return '#FF4D4F';
}

// ---------------------------------------------------------------------------
// Compliance table columns
// ---------------------------------------------------------------------------

const complianceColumns: ColumnsType<ProvinceCompliance> = [
  {
    title: 'Province',
    dataIndex: 'province',
    key: 'province',
  },
  {
    title: 'Operators',
    dataIndex: 'operators',
    key: 'operators',
    align: 'center',
  },
  {
    title: 'Avg Score',
    dataIndex: 'avgScore',
    key: 'avgScore',
    render: (score: number) => (
      <Progress
        percent={score}
        size="small"
        strokeColor={scoreColor(score)}
        style={{ minWidth: 100 }}
      />
    ),
  },
  {
    title: 'Active Alerts',
    dataIndex: 'activeAlerts',
    key: 'activeAlerts',
    align: 'center',
    render: (count: number) => (
      <span style={{ color: alertColor(count), fontWeight: 600 }}>{count}</span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NationalDashboard() {
  const { data: dashboard, isLoading: dashLoading } = useRegulatoryDashboard();
  const { data: trends, isLoading: trendsLoading } = useRegulatoryTrends();
  const { data: alertsPage, isLoading: alertsLoading } = useComplianceAlerts({ limit: 10 });

  const isLoading = dashLoading || trendsLoading || alertsLoading;

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  const db = dashboard?.data ?? dashboard;
  const alertItems = alertsPage?.data?.data ?? alertsPage?.data ?? [];
  const trendData = trends?.data ?? trends ?? [];

  // Build KPI strip from live dashboard data
  const KPI_DATA = [
    {
      label: 'Total Operators',
      value: String(db?.totalOperators ?? 0),
      icon: <Users size={20} />,
      iconBgColor: '#E6F0FF',
      trend: 'up' as const,
      changePercent: 0,
      changePeriod: '',
    },
    {
      label: 'Active Permits',
      value: String(db?.activePermits ?? 0),
      icon: <FileCheck size={20} />,
      iconBgColor: '#E6F5EF',
      trend: 'up' as const,
      changePercent: 0,
      changePeriod: '',
    },
    {
      label: 'Total Plants Tracked',
      value: (db?.totalPlants ?? 0).toLocaleString(),
      icon: <Sprout size={20} />,
      iconBgColor: '#E6F5EF',
      trend: 'up' as const,
      changePercent: 0,
      changePeriod: '',
    },
    {
      label: 'Pending Inspections',
      value: String(db?.pendingInspections ?? 0),
      icon: <Truck size={20} />,
      iconBgColor: '#FFF7E6',
      trend: 'down' as const,
      changePercent: 0,
      changePeriod: '',
    },
    {
      label: 'Avg Compliance Score',
      value: `${db?.complianceRate ?? 0}%`,
      icon: <ShieldCheck size={20} />,
      iconBgColor: '#E6F5EF',
      trend: 'up' as const,
      changePercent: 0,
      changePeriod: '',
    },
    {
      label: 'Flagged Operators',
      value: String(db?.flaggedOperators ?? 0),
      icon: <AlertTriangle size={20} />,
      iconBgColor: '#FFF1F0',
      trend: 'down' as const,
      changePercent: 0,
      changePeriod: '',
    },
  ];

  // Build activity items from dashboard recentActivity
  const ACTIVITY_ITEMS = (db?.recentActivity ?? []).map((a: any) => ({
    children: a.description ?? `[${a.type}] ${a.operatorName}`,
  }));

  return (
    <NctsPageContainer
      title="National Overview"
      subTitle="Cannabis Control Dashboard"
      extra={
        <DataFreshness
          lastUpdated={new Date().toISOString()}
          isLive
          onRefresh={() => {
            // Queries auto-refresh via React Query
          }}
        />
      }
    >
      {/* ----------------------------------------------------------------- */}
      {/* §4.1.2 — KPI Strip                                               */}
      {/* ----------------------------------------------------------------- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {KPI_DATA.map((kpi) => (
          <Col key={kpi.label} xxl={4} xl={8} md={12} xs={24}>
            <StatCard
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              iconBgColor={kpi.iconBgColor}
              trend={kpi.trend}
              changePercent={kpi.changePercent}
              changePeriod={kpi.changePeriod}
            />
          </Col>
        ))}
      </Row>

      {/* ----------------------------------------------------------------- */}
      {/* §4.1.3 — Facilities Map Placeholder                              */}
      {/* ----------------------------------------------------------------- */}
      <Card
        title="Facilities Map"
        style={{ marginBottom: 24 }}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            height: 400,
            background: 'linear-gradient(135deg, #f0f7f0 0%, #e6f0fa 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '24px 16px',
          }}
        >
          {/* Inline SVG — simplified South Africa outline */}
          <svg viewBox="0 0 500 420" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 440, height: 'auto', opacity: 0.9 }}>
            <path
              d="M168,72 L192,65 L220,60 L250,58 L280,60 L308,66 L330,75 L350,88 L362,82 L378,76 L390,78 L394,90 L388,105 L394,125 L402,148 L408,175 L410,205 L406,235 L398,262 L386,288 L372,310 L356,328 L338,342 L318,352 L296,360 L274,366 L255,368 L242,358 L234,342 L232,322 L240,306 L252,296 L244,288 L228,298 L212,312 L194,322 L176,328 L158,325 L142,316 L130,300 L122,280 L116,258 L112,235 L110,210 L111,185 L116,162 L124,140 L135,120 L150,100 L168,72Z"
              fill="#E8F5E9" stroke="#007A4D" strokeWidth="2.5" strokeLinejoin="round"
            />
            {/* Lesotho enclave */}
            <ellipse cx="322" cy="310" rx="20" ry="14" fill="#fff8e1" stroke="#D48806" strokeWidth="1.5" strokeDasharray="3,2" />
            <text x="322" y="314" textAnchor="middle" fontSize="8" fill="#D48806" fontWeight="600">LS</text>
            {/* Province labels */}
            <text x="200" y="175" textAnchor="middle" fontSize="10" fill="#007A4D" fontWeight="500" opacity={0.5}>NC</text>
            <text x="160" y="285" textAnchor="middle" fontSize="10" fill="#007A4D" fontWeight="500" opacity={0.5}>WC</text>
            <text x="295" y="295" textAnchor="middle" fontSize="10" fill="#007A4D" fontWeight="500" opacity={0.5}>EC</text>
            <text x="285" y="120" textAnchor="middle" fontSize="10" fill="#007A4D" fontWeight="500" opacity={0.5}>NW</text>
            <text x="340" y="105" textAnchor="middle" fontSize="10" fill="#007A4D" fontWeight="500" opacity={0.5}>GP</text>
            <text x="370" y="170" textAnchor="middle" fontSize="10" fill="#007A4D" fontWeight="500" opacity={0.5}>MP</text>
            <text x="240" y="130" textAnchor="middle" fontSize="10" fill="#007A4D" fontWeight="500" opacity={0.5}>FS</text>
            <text x="360" y="255" textAnchor="middle" fontSize="10" fill="#007A4D" fontWeight="500" opacity={0.5}>KZN</text>
            <text x="380" y="96" textAnchor="middle" fontSize="10" fill="#007A4D" fontWeight="500" opacity={0.5}>LP</text>
            {/* Facility markers */}
            <circle cx="338" cy="98" r="5" fill="#52c41a" stroke="#fff" strokeWidth="1.5" />
            <circle cx="165" cy="290" r="5" fill="#52c41a" stroke="#fff" strokeWidth="1.5" />
            <circle cx="355" cy="248" r="5" fill="#faad14" stroke="#fff" strokeWidth="1.5" />
            <circle cx="290" cy="108" r="4" fill="#52c41a" stroke="#fff" strokeWidth="1.5" />
            <circle cx="250" cy="126" r="4" fill="#1677ff" stroke="#fff" strokeWidth="1.5" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#595959' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#52c41a' }} />Active</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#faad14' }} />Pending</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f' }} />Issue</span>
          </div>
          <span style={{ color: '#8c8c8c', fontSize: 13, fontStyle: 'italic' }}>Interactive Map — Leaflet integration pending</span>
        </div>

        {/* Province summary bar */}
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            borderTop: '1px solid #F0F0F0',
          }}
        >
          {PROVINCE_FACILITIES.map((p) => (
            <Tag key={p.abbr} color={p.color}>
              {p.abbr}: {p.count}
            </Tag>
          ))}
        </div>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* §4.1.4 — Supply Chain / Compliance Row                            */}
      {/* ----------------------------------------------------------------- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Plant Lifecycle Donut */}
        <Col xl={12} xs={24}>
          <Card title="Plant Lifecycle" style={{ height: '100%' }}>
            <Pie
              theme="ncts"
              data={LIFECYCLE_DATA}
              angleField="value"
              colorField="type"
              innerRadius={0.6}
              height={280}
              label={{ text: 'type', position: 'outside' }}
              legend={{ position: 'bottom' }}
            />
          </Card>
        </Col>

        {/* Supply Chain Column Chart */}
        <Col xl={12} xs={24}>
          <Card title="Supply Chain Flow" style={{ height: '100%' }}>
            <ColumnChart
              theme="ncts"
              data={SUPPLY_CHAIN_DATA}
              xField="stage"
              yField="count"
              height={280}
              color={[CHART_COLORS[1], CHART_COLORS[4], CHART_COLORS[2], CHART_COLORS[5]]}
              label={{ position: 'top' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Compliance by Province */}
        <Col xs={24}>
          <Card title="Compliance by Province" style={{ height: '100%' }}>
            <Table<ProvinceCompliance>
              columns={complianceColumns}
              dataSource={PROVINCE_COMPLIANCE}
              pagination={false}
              size="small"
              onRow={(record) => ({
                style: { cursor: 'pointer' },
                onClick: () => {
                  // TODO: navigate to province drill-down
                  console.log('Navigate to province:', record.key);
                },
              })}
            />
          </Card>
        </Col>
      </Row>

      {/* ----------------------------------------------------------------- */}
      {/* §4.1.5 — Recent System Activity                                   */}
      {/* ----------------------------------------------------------------- */}
      <Card title="Recent System Activity">
        <Timeline items={ACTIVITY_ITEMS} />
      </Card>
    </NctsPageContainer>
  );
}
