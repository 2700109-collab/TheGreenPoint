import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Timeline, List, Button, Badge, Typography, FloatButton, Grid, Spin } from 'antd';
import { useOperatorDashboard, useActivityFeed, usePlants } from '@ncts/api-client';
import { useAuth } from '../../contexts/AuthContext';
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
// Types
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
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { user } = useAuth();

  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useOperatorDashboard(user?.tenantId ?? '');
  const { data: activityData, isLoading: isActivityLoading } = useActivityFeed(user?.tenantId ?? '');
  const { data: plantsResponse, isLoading: isPlantsLoading } = usePlants();

  const dashboard = dashboardData as any;
  const activity: ActivityItem[] = ((activityData as any)?.data ?? activityData ?? []) as ActivityItem[];
  const allPlants: any[] = ((plantsResponse as any)?.data ?? plantsResponse ?? []);

  // Derive KPI values from dashboard API response
  const kpi = useMemo(() => ({
    activePlants: { value: dashboard?.activePlants != null ? dashboard.activePlants.toLocaleString() : '—' },
    pendingTransfers: { value: dashboard?.pendingTransfers != null ? String(dashboard.pendingTransfers) : '—' },
    monthlySales: { value: dashboard?.monthlySales != null ? `R ${dashboard.monthlySales.toLocaleString()}` : '—' },
    complianceScore: { value: dashboard?.complianceScore != null ? `${dashboard.complianceScore}%` : '—' },
  }), [dashboard]);

  // Derive lifecycle counts from plants data
  const lifecycle: LifecycleStage[] = useMemo(() => {
    const stageCounts: Record<string, number> = { Seedling: 0, Vegetative: 0, Flowering: 0, Harvested: 0, Destroyed: 0 };
    const stageColors: Record<string, string> = { Seedling: '#95DE64', Vegetative: '#73D13D', Flowering: '#FF9C6E', Harvested: '#69B1FF', Destroyed: '#FF4D4F' };
    allPlants.forEach((p: any) => {
      const stage = (p.currentStage ?? '').charAt(0).toUpperCase() + (p.currentStage ?? '').slice(1);
      if (stage in stageCounts) stageCounts[stage]++;
    });
    const total = Object.values(stageCounts).reduce((s, c) => s + c, 0) || 1;
    return Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count,
      color: stageColors[stage] ?? '#8c8c8c',
      percent: Math.round((count / total) * 100),
    }));
  }, [allPlants]);

  // Empty alerts — derive from dashboard when endpoint is available
  const alerts: AlertItem[] = [];

  const loading = isDashboardLoading || isActivityLoading || isPlantsLoading;

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
            refetchDashboard();
          }}
        />
      }
    >
      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xl={6} md={12} sm={24} xs={24}>
          <StatCard
            label="Active Plants"
            value={kpi.activePlants.value}
            icon={<Sprout size={20} />}
            iconBgColor="#E6F5EF"
            changePeriod="vs last 30 days"
            onClick={() => navigate('/operator/plants')}
          />
        </Col>
        <Col xl={6} md={12} sm={24} xs={24}>
          <StatCard
            label="Pending Transfers"
            value={kpi.pendingTransfers.value}
            icon={<Truck size={20} />}
            iconBgColor="#FFF7E6"
            changePeriod="vs last 30 days"
            onClick={() => navigate('/operator/transfers')}
          />
        </Col>
        <Col xl={6} md={12} sm={24} xs={24}>
          <StatCard
            label="Monthly Sales"
            value={kpi.monthlySales.value}
            icon={<ShoppingCart size={20} />}
            iconBgColor="#E6F7FF"
            changePeriod="vs last month"
            onClick={() => navigate('/operator/sales')}
          />
        </Col>
        <Col xl={6} md={12} sm={24} xs={24}>
          <StatCard
            label="Compliance Score"
            value={kpi.complianceScore.value}
            icon={<ShieldCheck size={20} />}
            iconBgColor={parseInt(kpi.complianceScore.value) >= 90 ? '#F6FFED' : parseInt(kpi.complianceScore.value) >= 70 ? '#FFFBE6' : '#FFF1F0'}
            changePeriod="vs last assessment"
          />
        </Col>
      </Row>

      {/* ── Charts Row ──────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xl={12} xs={24}>
          <Card title="Plant Lifecycle Distribution" size="small">
            <Pie
              theme="ncts"
              data={lifecycle.map((s) => ({ stage: s.stage, count: s.count }))}
              angleField="count"
              colorField="stage"
              innerRadius={0.55}
              height={220}
              color={lifecycle.map((s) => s.color)}
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
              items={activity.map((item) => {
                const meta = ACTIVITY_ICON_MAP[item.type as ActivityItem['type']] ?? { icon: <Clock size={14} />, color: '#8c8c8c' };
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
                <Badge count={alerts.length} style={{ marginLeft: 8 }} />
              </span>
            }
            size="small"
            extra={<Button type="link" size="small">View all</Button>}
          >
            <List
              dataSource={alerts}
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
