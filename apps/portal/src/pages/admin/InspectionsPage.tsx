/**
 * InspectionsPage — Inspection calendar/list view with upcoming sidebar.
 * Per FrontEnd.md §4.9.1.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  List,
  Row,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Plus, ClipboardCheck, Eye, Clock } from 'lucide-react';
import {
  StatusBadge,
  NctsPageContainer,
  DataFreshness,
  CsvExportButton,
} from '@ncts/ui';
import { Column as ColumnChart, Pie, Line as LineChart } from '@ant-design/charts';

dayjs.extend(relativeTime);

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InspectionType = 'Routine' | 'Complaint' | 'Follow-up' | 'Random';
type InspectionStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue';
type InspectionOutcome = 'Pass' | 'Conditional' | 'Fail' | 'Pending';

interface Inspection {
  id: string;
  facilityId: string;
  facilityName: string;
  type: InspectionType;
  scheduledDate: string;
  inspector: string;
  status: InspectionStatus;
  outcome: InspectionOutcome;
}

// ---------------------------------------------------------------------------
// Colour maps
// ---------------------------------------------------------------------------

const TYPE_COLOR: Record<InspectionType, string> = {
  Routine: 'blue',
  Complaint: 'red',
  'Follow-up': 'orange',
  Random: 'purple',
};

const OUTCOME_COLOR: Record<InspectionOutcome, string> = {
  Pass: 'green',
  Conditional: 'gold',
  Fail: 'red',
  Pending: 'default',
};

// ---------------------------------------------------------------------------
// Mock Data — TODO: Replace with API hooks (GET /inspections)
// ---------------------------------------------------------------------------

const now = dayjs();
const ym = now.format('YYYY-MM');

const MOCK_INSPECTIONS: Inspection[] = [
  { id: 'INS-001', facilityId: 'FAC-01', facilityName: 'GreenLeaf Cultivation', type: 'Routine', scheduledDate: `${ym}-03`, inspector: 'N. Mthembu', status: 'Completed', outcome: 'Pass' },
  { id: 'INS-002', facilityId: 'FAC-02', facilityName: 'Cape Cannabis Processing', type: 'Complaint', scheduledDate: `${ym}-07`, inspector: 'T. Nkosi', status: 'Completed', outcome: 'Fail' },
  { id: 'INS-003', facilityId: 'FAC-03', facilityName: 'Durban Botanicals', type: 'Follow-up', scheduledDate: `${ym}-11`, inspector: 'B. Dlamini', status: 'In Progress', outcome: 'Pending' },
  { id: 'INS-004', facilityId: 'FAC-04', facilityName: 'Highveld Growers', type: 'Routine', scheduledDate: `${ym}-14`, inspector: 'S. Mokoena', status: 'Scheduled', outcome: 'Pending' },
  { id: 'INS-005', facilityId: 'FAC-05', facilityName: 'Eastern Roots Trading', type: 'Random', scheduledDate: `${ym}-18`, inspector: 'N. Mthembu', status: 'Scheduled', outcome: 'Pending' },
  { id: 'INS-006', facilityId: 'FAC-01', facilityName: 'GreenLeaf Cultivation', type: 'Follow-up', scheduledDate: `${ym}-21`, inspector: 'T. Nkosi', status: 'Overdue', outcome: 'Pending' },
  { id: 'INS-007', facilityId: 'FAC-06', facilityName: 'Free State Extracts', type: 'Routine', scheduledDate: `${ym}-24`, inspector: 'B. Dlamini', status: 'Scheduled', outcome: 'Pending' },
  { id: 'INS-008', facilityId: 'FAC-07', facilityName: 'Limpopo Leaf Industries', type: 'Complaint', scheduledDate: `${ym}-28`, inspector: 'S. Mokoena', status: 'Completed', outcome: 'Conditional' },
];

// ---------------------------------------------------------------------------
// Upcoming inspections (next 7 days) — TODO: compute from API response
// ---------------------------------------------------------------------------

const UPCOMING: Inspection[] = MOCK_INSPECTIONS.filter((i) => {
  const d = dayjs(i.scheduledDate);
  return d.isAfter(now) && d.diff(now, 'day') <= 7;
});

// ---------------------------------------------------------------------------
// CSV columns
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { key: 'id', header: 'Inspection ID' },
  { key: 'facilityName', header: 'Facility' },
  { key: 'type', header: 'Type' },
  { key: 'scheduledDate', header: 'Scheduled Date' },
  { key: 'inspector', header: 'Inspector' },
  { key: 'status', header: 'Status' },
  { key: 'outcome', header: 'Outcome' },
];

// ---------------------------------------------------------------------------
// Inspection Analytics mock data (§4.9.4)
// ---------------------------------------------------------------------------

const INSPECTIONS_PER_MONTH = [
  { month: 'Mar', count: 12 },
  { month: 'Apr', count: 15 },
  { month: 'May', count: 10 },
  { month: 'Jun', count: 18 },
  { month: 'Jul', count: 14 },
  { month: 'Aug', count: 20 },
  { month: 'Sep', count: 16 },
  { month: 'Oct', count: 22 },
  { month: 'Nov', count: 19 },
  { month: 'Dec', count: 11 },
  { month: 'Jan', count: 17 },
  { month: 'Feb', count: 21 },
];

const PASS_FAIL_DATA = [
  { type: 'Pass', value: 68 },
  { type: 'Conditional', value: 22 },
  { type: 'Fail', value: 10 },
];

const REMEDIATION_TIME = [
  { month: 'Mar', days: 18 },
  { month: 'Apr', days: 15 },
  { month: 'May', days: 22 },
  { month: 'Jun', days: 14 },
  { month: 'Jul', days: 12 },
  { month: 'Aug', days: 16 },
  { month: 'Sep', days: 10 },
  { month: 'Oct', days: 13 },
  { month: 'Nov', days: 9 },
  { month: 'Dec', days: 11 },
  { month: 'Jan', days: 8 },
  { month: 'Feb', days: 7 },
];

// ---------------------------------------------------------------------------
// Calendar dot colour helper
// ---------------------------------------------------------------------------

function dotColor(insp: Inspection): string {
  if (insp.status === 'Completed' && insp.outcome === 'Pass') return '#52c41a';
  if (insp.status === 'Completed' && insp.outcome === 'Fail') return '#ff4d4f';
  if (insp.status === 'Overdue') return '#ff4d4f';
  if (insp.status === 'In Progress') return '#1677ff';
  return '#faad14'; // Scheduled
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectionsPage() {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(undefined);
  const [view, setView] = useState<'Calendar' | 'List' | 'Analytics'>('Calendar');

  // ── Calendar cell renderer ──────────────────────────────────────
  const dateCellRender = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const hits = MOCK_INSPECTIONS.filter((i) => i.scheduledDate === dateStr);
    if (hits.length === 0) return null;
    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
        {hits.map((h) => (
          <Badge
            key={h.id}
            color={dotColor(h)}
            text={<span style={{ fontSize: 11 }}>{h.facilityName.split(' ')[0]}</span>}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </div>
    );
  };

  // ── ProTable columns ────────────────────────────────────────────
  const columns: ProColumns<Inspection>[] = [
    {
      title: 'Inspection ID',
      dataIndex: 'id',
      width: 130,
      render: (_dom, row) => (
        <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/compliance/inspections/${row.id}`)}>
          {row.id}
        </Tag>
      ),
    },
    {
      title: 'Facility',
      dataIndex: 'facilityName',
      render: (_dom, row) => (
        <a onClick={() => navigate('/admin/facilities')} style={{ cursor: 'pointer' }}>
          {row.facilityName}
        </a>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 120,
      render: (_dom, row) => <Tag color={TYPE_COLOR[row.type]}>{row.type}</Tag>,
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduledDate',
      width: 140,
      render: (_dom, row) => dayjs(row.scheduledDate).format('DD MMM YYYY'),
    },
    {
      title: 'Inspector',
      dataIndex: 'inspector',
      width: 140,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      render: (_dom, row) => (
        <StatusBadge {...({ status: row.status.toLowerCase().replace(/ /g, '_'), size: 'sm' } as any)} />
      ),
    },
    {
      title: 'Outcome',
      dataIndex: 'outcome',
      width: 120,
      render: (_dom, row) => <Tag color={OUTCOME_COLOR[row.outcome]}>{row.outcome}</Tag>,
    },
    {
      title: 'Actions',
      width: 90,
      render: (_dom, row) => (
        <Button
          type="link"
          size="small"
          icon={<Eye size={14} />}
          onClick={() => navigate(`/admin/compliance/inspections/${row.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <NctsPageContainer
      title="Inspections"
      subTitle="Schedule and track facility inspections"
      extra={
        <Space size="middle">
          <DataFreshness {...({ timestamp: dayjs().subtract(4, 'minute').toISOString() } as any)} />
          <CsvExportButton {...({ data: MOCK_INSPECTIONS, columns: CSV_COLUMNS, filename: 'inspections' } as any)} />
          <Segmented
            options={['Calendar', 'List', 'Analytics']}
            value={view}
            onChange={(v) => setView(v as 'Calendar' | 'List' | 'Analytics')}
          />
          <Button
            type="primary"
            icon={
              <Space size={4}>
                <Plus size={14} />
                <ClipboardCheck size={14} />
              </Space>
            }
            onClick={() => navigate('/admin/compliance/inspections/new')}
          >
            Schedule Inspection
          </Button>
        </Space>
      }
    >
      {/* ── Calendar View ─────────────────────────────────────────── */}
      {view === 'Calendar' && (
        <Card style={{ marginBottom: 24 }}>
          <Calendar cellRender={(date, info) => (info.type === 'date' ? dateCellRender(date) : null)} />
        </Card>
      )}

      {/* ── List View ─────────────────────────────────────────────── */}
      {view === 'List' && (
        <ProTable<Inspection>
          actionRef={actionRef}
          columns={columns}
          dataSource={MOCK_INSPECTIONS}
          rowKey="id"
          search={false}
          pagination={{ pageSize: 10 }}
          dateFormatter="string"
          headerTitle="All Inspections"
          toolBarRender={false}
        />
      )}
      {/* ── Analytics View (§4.9.4) ──────────────────────────────────────── */}
      {view === 'Analytics' && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} xl={12}>
            <Card title="Inspections per Month">
              <ColumnChart theme="ncts" data={INSPECTIONS_PER_MONTH} xField="month" yField="count" height={260} />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="Outcome Distribution">
              <Pie
                theme="ncts"
                data={PASS_FAIL_DATA}
                angleField="value"
                colorField="type"
                innerRadius={0.6}
                height={260}
                label={{ text: 'type', position: 'outside' }}
              />
            </Card>
          </Col>
          <Col xs={24}>
            <Card title="Average Remediation Time (Days)">
              <LineChart theme="ncts" data={REMEDIATION_TIME} xField="month" yField="days" smooth={true} height={260} point={{ size: 4, shape: 'circle' }} />
            </Card>
          </Col>
        </Row>
      )}
      {/* ── Upcoming Inspections Card ─────────────────────────────── */}
      <Card
        title={
          <Space>
            <Clock size={16} />
            <span>Upcoming Inspections (Next 7 Days)</span>
          </Space>
        }
        style={{ marginTop: view === 'Calendar' ? 0 : 24 }}
      >
        {UPCOMING.length === 0 ? (
          <Text type="secondary">No inspections scheduled in the next 7 days.</Text>
        ) : (
          <List
            dataSource={UPCOMING}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="view"
                    type="link"
                    size="small"
                    onClick={() => navigate(`/admin/compliance/inspections/${item.id}`)}
                  >
                    View
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={TYPE_COLOR[item.type]}>{item.type}</Tag>
                      <a onClick={() => navigate(`/admin/compliance/inspections/${item.id}`)} style={{ cursor: 'pointer' }}>
                        {item.id}
                      </a>
                    </Space>
                  }
                  description={`${item.facilityName} — ${dayjs(item.scheduledDate).format('DD MMM YYYY')} — Inspector: ${item.inspector}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </NctsPageContainer>
  );
}
