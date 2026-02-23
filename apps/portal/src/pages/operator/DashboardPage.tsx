import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Timeline, List, Button, Badge, Typography, FloatButton, Grid } from 'antd';
import { Pie, Line } from '@ant-design/charts';
import {
  Sprout,
  Truck,
  ShoppingCart,
  ShieldCheck,
  Plus,
  Wheat,
  FlaskConical,
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  StatCard,
  DataFreshness,
  SkeletonPage,
  NctsPageContainer,
  CHART_COLORS,
} from '@ncts/ui';

const { useBreakpoint } = Grid;

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Mock Data — TODO: Replace with real API hooks
// (useOperatorDashboard, usePlants, useTransfers, useSales, useActivityFeed)
// ---------------------------------------------------------------------------

interface ActivityItem {
  id: string;
  type: 'plant_registered' | 'transfer_initiated' | 'harvest_recorded' | 'lab_result' | 'sale_completed';
  description: string;
  timestamp: string;
  entityId: string;
}

interface AlertItem {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  route: string;
}

interface LifecycleStage {
  stage: string;
  count: number;
  color: string;
  percent: number;
}

const MOCK_KPI = {
  activePlants: { value: '1,247', trend: 'up' as const, changePercent: 12.3, sparkline: [40, 44, 38, 52, 48, 56, 61] },
  pendingTransfers: { value: '23', trend: 'up' as const, changePercent: 8.1, sparkline: [5, 3, 7, 4, 6, 8, 5] },
  monthlySales: { value: 'R 842,500', trend: 'up' as const, changePercent: 15.7, sparkline: [120, 135, 110, 150, 142, 168, 180] },
  complianceScore: { value: '94%', trend: 'up' as const, changePercent: 2.1, sparkline: [88, 90, 89, 91, 92, 93, 94] },
};

const MOCK_LIFECYCLE: LifecycleStage[] = [
  { stage: 'Seedling', count: 312, color: '#95DE64', percent: 25 },
  { stage: 'Vegetative', count: 486, color: '#73D13D', percent: 39 },
  { stage: 'Flowering', count: 274, color: '#FF9C6E', percent: 22 },
  { stage: 'Harvested', count: 137, color: '#69B1FF', percent: 11 },
  { stage: 'Destroyed', count: 38, color: '#FF4D4F', percent: 3 },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: '1', type: 'plant_registered', description: 'Registered 24 new seedlings at GreenFields Farm', timestamp: '2026-02-21T09:15:00Z', entityId: 'PLT-20260221-A7F3' },
  { id: '2', type: 'transfer_initiated', description: 'Transfer of 50 plants to Cape Processing', timestamp: '2026-02-21T08:42:00Z', entityId: 'TRF-20260221-B2C1' },
  { id: '3', type: 'harvest_recorded', description: 'Harvested 120 plants — 48.6 kg dry weight', timestamp: '2026-02-20T16:30:00Z', entityId: 'HRV-20260220-D4E5' },
  { id: '4', type: 'lab_result', description: 'Lab results received for batch BT-2026-0142', timestamp: '2026-02-20T14:10:00Z', entityId: 'LAB-20260220-F6G7' },
  { id: '5', type: 'sale_completed', description: 'Sale of 12 kg to licensed retailer', timestamp: '2026-02-20T11:05:00Z', entityId: 'SAL-20260220-H8J9' },
  { id: '6', type: 'plant_registered', description: 'Registered 18 clones at Durban Nursery', timestamp: '2026-02-19T15:20:00Z', entityId: 'PLT-20260219-K1L2' },
];

const MOCK_ALERTS: AlertItem[] = [
  { id: '1', severity: 'error', message: 'Compliance violation: PLT-20260218-X3Y4 missing inspection', timestamp: '2 hours ago', route: '/operator/plants' },
  { id: '2', severity: 'warning', message: 'Cultivation permit expiring in 28 days', timestamp: 'Yesterday', route: '/operator/dashboard' },
  { id: '3', severity: 'info', message: 'Incoming transfer TRF-20260221-M5N6 pending acceptance', timestamp: '3 hours ago', route: '/operator/transfers' },
];

// Mock 30-day transfer volume data — outgoing + incoming
const MOCK_TRANSFER_OUTGOING = [2, 3, 1, 4, 2, 3, 5, 1, 3, 6, 4, 2, 4, 3, 5, 6, 3, 2, 4, 2, 3, 5, 3, 6, 2, 4, 7, 3, 4, 5];
const MOCK_TRANSFER_INCOMING = [1, 2, 1, 3, 2, 3, 3, 2, 2, 3, 2, 2, 3, 2, 3, 4, 3, 2, 3, 1, 2, 3, 3, 3, 2, 3, 4, 2, 2, 3];

function buildTransferLineData() {
  const today = new Date();
  const data: { date: string; value: number; type: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    data.push({ date: label, value: MOCK_TRANSFER_OUTGOING[29 - i] ?? 0, type: 'Outgoing' });
    data.push({ date: label, value: MOCK_TRANSFER_INCOMING[29 - i] ?? 0, type: 'Incoming' });
  }
  return data;
}

const TRANSFER_LINE_DATA = buildTransferLineData();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTIVITY_ICON_MAP: Record<ActivityItem['type'], { icon: React.ReactNode; color: string }> = {
  plant_registered: { icon: <Sprout size={14} />, color: '#52C41A' },
  transfer_initiated: { icon: <Truck size={14} />, color: '#1890FF' },
  harvest_recorded: { icon: <Wheat size={14} />, color: '#D4A017' },
  lab_result: { icon: <FlaskConical size={14} />, color: '#722ED1' },
  sale_completed: { icon: <DollarSign size={14} />, color: '#13C2C2' },
};

const SEVERITY_COLOR: Record<AlertItem['severity'], string> = {
  error: '#FF4D4F',
  warning: '#FAAD14',
  info: '#1890FF',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Simulate initial data fetch — TODO: replace with real query loading states
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <SkeletonPage variant="dashboard" cards={4} />;
  }

  return (
    <NctsPageContainer
      title="Dashboard"
      subTitle="Operator overview"
      extra={
        <DataFreshness
          lastUpdated={new Date().toISOString()}
          onRefresh={() => {
            /* TODO: invalidate react-query cache */
          }}
        />
      }
    >
      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xl={6} md={12} sm={24} xs={24}>
          <StatCard
            label="Active Plants"
            value={MOCK_KPI.activePlants.value}
            icon={<Sprout size={20} />}
            iconBgColor="#E6F5EF"
            trend={MOCK_KPI.activePlants.trend}
            changePercent={MOCK_KPI.activePlants.changePercent}
            changePeriod="vs last 30 days"
            sparkline={MOCK_KPI.activePlants.sparkline}
            onClick={() => navigate('/operator/plants')}
          />
        </Col>
        <Col xl={6} md={12} sm={24} xs={24}>
          <StatCard
            label="Pending Transfers"
            value={MOCK_KPI.pendingTransfers.value}
            icon={<Truck size={20} />}
            iconBgColor="#FFF7E6"
            trend={MOCK_KPI.pendingTransfers.trend}
            changePercent={MOCK_KPI.pendingTransfers.changePercent}
            changePeriod="vs last 30 days"
            sparkline={MOCK_KPI.pendingTransfers.sparkline}
            onClick={() => navigate('/operator/transfers')}
          />
        </Col>
        <Col xl={6} md={12} sm={24} xs={24}>
          <StatCard
            label="Monthly Sales"
            value={MOCK_KPI.monthlySales.value}
            icon={<ShoppingCart size={20} />}
            iconBgColor="#E6F7FF"
            trend={MOCK_KPI.monthlySales.trend}
            changePercent={MOCK_KPI.monthlySales.changePercent}
            changePeriod="vs last month"
            sparkline={MOCK_KPI.monthlySales.sparkline}
            onClick={() => navigate('/operator/sales')}
          />
        </Col>
        <Col xl={6} md={12} sm={24} xs={24}>
          <StatCard
            label="Compliance Score"
            value={MOCK_KPI.complianceScore.value}
            icon={<ShieldCheck size={20} />}
            iconBgColor={parseInt(MOCK_KPI.complianceScore.value) >= 90 ? '#F6FFED' : parseInt(MOCK_KPI.complianceScore.value) >= 70 ? '#FFFBE6' : '#FFF1F0'}
            trend={MOCK_KPI.complianceScore.trend}
            changePercent={MOCK_KPI.complianceScore.changePercent}
            changePeriod="vs last assessment"
            sparkline={MOCK_KPI.complianceScore.sparkline}
          />
        </Col>
      </Row>

      {/* ── Charts Row ──────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xl={12} xs={24}>
          <Card title="Plant Lifecycle Distribution" size="small">
            <Pie
              theme="ncts"
              data={MOCK_LIFECYCLE.map((s) => ({ stage: s.stage, count: s.count }))}
              angleField="count"
              colorField="stage"
              innerRadius={0.55}
              height={220}
              color={MOCK_LIFECYCLE.map((s) => s.color)}
              label={{ text: 'count', style: { fontWeight: 600, fontSize: 12 } }}
              tooltip={{ title: 'stage', items: [{ field: 'count', name: 'Plants' }] }}
              legend={{ position: 'right' }}
              style={{ inset: 2 }}
            />
          </Card>
        </Col>
        <Col xl={12} xs={24}>
          <Card title="Transfer Volume (30 Days)" size="small">
            <Line
              theme="ncts"
              data={TRANSFER_LINE_DATA}
              xField="date"
              yField="value"
              colorField="type"
              height={220}
              color={[CHART_COLORS[4], CHART_COLORS[1]]}
              shapeField="smooth"
              tooltip={{ items: [{ field: 'value', name: 'Transfers' }] }}
              axis={{
                x: { label: { autoRotate: true, style: { fontSize: 10 } } },
                y: { title: 'Transfers' },
              }}
              legend={{ position: 'top-right' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Activity Feed + Alerts ──────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xl={14} xs={24}>
          <Card
            title="Recent Activity"
            size="small"
            extra={<Button type="link" size="small" onClick={() => navigate('/operator/dashboard')}>View all</Button>}
          >
            <Timeline
              items={MOCK_ACTIVITY.map((item) => {
                const meta = ACTIVITY_ICON_MAP[item.type];
                return {
                  dot: (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: `${meta.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: meta.color,
                      }}
                    >
                      {meta.icon}
                    </div>
                  ),
                  children: (
                    <div>
                      <Text>{item.description}</Text>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <Clock size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                          {relativeTime(item.timestamp)}
                        </Text>
                        <Text code style={{ fontSize: 11 }}>{item.entityId}</Text>
                      </div>
                    </div>
                  ),
                };
              })}
            />
          </Card>
        </Col>

        <Col xl={10} xs={24}>
          <Card
            title={
              <span>
                <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: '#FAAD14' }} />
                Active Alerts
                <Badge count={MOCK_ALERTS.length} style={{ marginLeft: 8 }} />
              </span>
            }
            size="small"
            extra={<Button type="link" size="small">View all</Button>}
          >
            <List
              dataSource={MOCK_ALERTS}
              renderItem={(alert) => (
                <List.Item
                  style={{ cursor: 'pointer', padding: '10px 0' }}
                  onClick={() => navigate(alert.route)}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: SEVERITY_COLOR[alert.severity],
                          marginTop: 6,
                        }}
                      />
                    }
                    title={<Text style={{ fontSize: 13 }}>{alert.message}</Text>}
                    description={<Text type="secondary" style={{ fontSize: 12 }}>{alert.timestamp}</Text>}
                  />
                  <ArrowRight size={14} style={{ color: '#8C8C8C' }} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Quick Actions — Desktop button bar ─────────────────────── */}
      {!isMobile && (
        <Card size="small" style={{ marginTop: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <Button
                block
                type="primary"
                icon={<><Plus size={14} style={{ marginRight: 4 }} /><Sprout size={14} /></>}
                onClick={() => navigate('/operator/plants/register')}
              >
                Register Plant
              </Button>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                block
                icon={<><Plus size={14} style={{ marginRight: 4 }} /><Wheat size={14} /></>}
                onClick={() => navigate('/operator/harvests')}
              >
                Record Harvest
              </Button>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                block
                icon={<><Plus size={14} style={{ marginRight: 4 }} /><Truck size={14} /></>}
                onClick={() => navigate('/operator/transfers')}
              >
                Create Transfer
              </Button>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                block
                icon={<><Plus size={14} style={{ marginRight: 4 }} /><ShoppingCart size={14} /></>}
                onClick={() => navigate('/operator/sales')}
              >
                Record Sale
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* ── Quick Actions — Mobile speed-dial FAB ───────────────────── */}
      {isMobile && (
        <FloatButton.Group
          trigger="click"
          type="primary"
          icon={<Plus size={20} />}
          style={{ insetInlineEnd: 24, insetBlockEnd: 24 }}
        >
          <FloatButton
            icon={<Sprout size={16} />}
            tooltip="Register Plant"
            onClick={() => navigate('/operator/plants/register')}
          />
          <FloatButton
            icon={<Wheat size={16} />}
            tooltip="Record Harvest"
            onClick={() => navigate('/operator/harvests')}
          />
          <FloatButton
            icon={<Truck size={16} />}
            tooltip="Create Transfer"
            onClick={() => navigate('/operator/transfers')}
          />
          <FloatButton
            icon={<ShoppingCart size={16} />}
            tooltip="Record Sale"
            onClick={() => navigate('/operator/sales')}
          />
        </FloatButton.Group>
      )}
    </NctsPageContainer>
  );
}
