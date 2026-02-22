/**
 * §4.1 National Overview Dashboard
 *
 * Top-level dashboard for NCTS administrators showing KPIs, facility map
 * placeholder, supply-chain flow, compliance by province, and recent activity.
 *
 * TODO: Replace all mock data with live API calls once endpoints are ready.
 */

import { Card, Col, Row, Table, Tag, Timeline, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Users,
  FileCheck,
  Sprout,
  Truck,
  DollarSign,
  ShieldCheck,
  UserPlus,
  AlertTriangle,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import { NctsPageContainer, DataFreshness, StatCard, CHART_COLORS } from '@ncts/ui';
import { Pie, Column as ColumnChart } from '@ant-design/charts';

// ---------------------------------------------------------------------------
// Mock data — TODO: replace with API hooks
// ---------------------------------------------------------------------------

/** KPI definitions for the top stat strip */
const KPI_DATA = [
  {
    label: 'Total Operators',
    value: '127',
    icon: <Users size={20} />,
    iconBgColor: '#E6F0FF',
    trend: 'up' as const,
    changePercent: 8.5,
    changePeriod: 'vs last month',
  },
  {
    label: 'Active Permits',
    value: '312',
    icon: <FileCheck size={20} />,
    iconBgColor: '#E6F5EF',
    trend: 'up' as const,
    changePercent: 5.2,
    changePeriod: 'vs last month',
  },
  {
    label: 'Total Plants Tracked',
    value: '18,456',
    icon: <Sprout size={20} />,
    iconBgColor: '#E6F5EF',
    trend: 'up' as const,
    changePercent: 12.1,
    changePeriod: 'vs last month',
  },
  {
    label: 'Active Transfers',
    value: '89',
    icon: <Truck size={20} />,
    iconBgColor: '#FFF7E6',
    trend: 'down' as const,
    changePercent: 3.4,
    changePeriod: 'vs last month',
  },
  {
    label: 'Monthly Revenue',
    value: 'R 4.2M',
    icon: <DollarSign size={20} />,
    iconBgColor: '#E6F0FF',
    trend: 'up' as const,
    changePercent: 15.7,
    changePeriod: 'vs last month',
  },
  {
    label: 'Avg Compliance Score',
    value: '92%',
    icon: <ShieldCheck size={20} />,
    // Traffic-light green background for high compliance
    iconBgColor: '#E6F5EF',
    trend: 'up' as const,
    changePercent: 1.8,
    changePeriod: 'vs last month',
  },
];

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

/** Supply chain Column chart data */
const SUPPLY_CHAIN_DATA = [
  { stage: 'Cultivated', count: 18456 },
  { stage: 'Tested', count: 14230 },
  { stage: 'Transferred', count: 12421 },
  { stage: 'Sold', count: 9842 },
];

/** Plant lifecycle donut chart data */
const LIFECYCLE_DATA = [
  { type: 'Seedling', value: 3200 },
  { type: 'Vegetative', value: 5800 },
  { type: 'Flowering', value: 4500 },
  { type: 'Harvested', value: 3200 },
  { type: 'Destroyed', value: 1756 },
];

/** Compliance-by-province table data */
interface ProvinceCompliance {
  key: string;
  province: string;
  operators: number;
  avgScore: number;
  activeAlerts: number;
}

// TODO: Fetch from /api/v1/regulatory/compliance-by-province
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

/** Recent system activity items */
const ACTIVITY_ITEMS = [
  {
    dot: <UserPlus size={16} style={{ color: '#1890FF' }} />,
    children: 'New operator registered: GreenFields Cannabis (Pty) Ltd',
  },
  {
    dot: <FileCheck size={16} style={{ color: '#52C41A' }} />,
    children: 'Permit PRM-20260221-X7Y8 approved',
  },
  {
    dot: <AlertTriangle size={16} style={{ color: '#FF4D4F' }} />,
    children: 'Compliance alert: Unaccounted plant loss at Facility FAC-20260101-AB12',
  },
  {
    dot: <Truck size={16} style={{ color: '#D48806' }} />,
    children: 'Transfer TRF-20260221-M5N6 completed',
  },
  {
    dot: <FileText size={16} style={{ color: '#722ED1' }} />,
    children: 'Monthly report submitted by ABC Cannabis',
  },
  {
    dot: <ClipboardCheck size={16} style={{ color: '#13C2C2' }} />,
    children: 'Inspection scheduled at Cape Town Grow',
  },
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
  return (
    <NctsPageContainer
      title="National Overview"
      subTitle="Cannabis Control Dashboard"
      extra={
        <DataFreshness
          lastUpdated={new Date().toISOString()}
          isLive
          onRefresh={() => {
            // TODO: trigger SWR/react-query revalidation
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
