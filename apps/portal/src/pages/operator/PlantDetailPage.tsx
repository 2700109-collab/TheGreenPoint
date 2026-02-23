/**
 * PlantDetailPage — Individual plant detail view with lifecycle, metadata,
 * QR code, activity log, lab results, transfers, documents, and audit trail.
 *
 * Per FrontEnd.md §3.5.
 */

import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Descriptions,
  Card,
  Tabs,
  Button,
  Tag,
  Dropdown,
  Timeline,
  Table,
  Typography,
  Breadcrumb,
  Space,
  Spin,
  Empty,
  Row,
  Col,
  QRCode,
} from 'antd';
import type { MenuProps, TabsProps } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Wheat,
  MoreHorizontal,
  Pencil,
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  PlantLifecycle,
  StatusBadge,
  TrackingId,
  PrintButton,
  NctsPageContainer,
} from '@ncts/ui';
import type { PlantStage, LifecycleStageInfo } from '@ncts/ui';

dayjs.extend(relativeTime);

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlantDetail {
  id: string;
  trackingId: string;
  strain: string;
  strainType: 'indica' | 'sativa' | 'hybrid';
  currentStage: PlantStage;
  sourceType: 'seed' | 'clone' | 'mother_plant';
  motherPlantId: string | null;
  facilityId: string;
  facilityName: string;
  growingZone: string;
  growingMedium: string;
  plantedDate: string;
  physicalTagType: string;
  physicalTagNumber: string;
  gpsCoords: { lat: number; lng: number };
  stages: LifecycleStageInfo[];
  photoUrl: string | null;
}

// ---------------------------------------------------------------------------
// Mock Data — TODO: Replace with real API calls (e.g. usePlant(id))
// ---------------------------------------------------------------------------

const now = dayjs();

const MOCK_PLANT: PlantDetail = {
  id: '1',
  trackingId: 'PLT-20260215-A7F3',
  strain: 'Purple Haze',
  strainType: 'indica',
  currentStage: 'flowering',
  sourceType: 'clone',
  motherPlantId: 'PLT-20251120-B2C4',
  facilityId: 'fac-1',
  facilityName: 'GreenFields Farm',
  growingZone: 'Zone A — Greenhouse 3',
  growingMedium: 'Coco Coir / Perlite Mix',
  plantedDate: now.subtract(45, 'day').format('YYYY-MM-DD'),
  physicalTagType: 'RFID',
  physicalTagNumber: 'RF-00482',
  gpsCoords: { lat: -33.9249, lng: 18.4241 },
  stages: [
    { stage: 'seed' as PlantStage, date: now.subtract(45, 'day').format('YYYY-MM-DD'), note: 'Clone taken from mother' },
    { stage: 'seedling' as PlantStage, date: now.subtract(38, 'day').format('YYYY-MM-DD'), note: 'Rooted successfully' },
    { stage: 'vegetative' as PlantStage, date: now.subtract(24, 'day').format('YYYY-MM-DD'), note: 'Moved to veg room' },
    { stage: 'flowering' as PlantStage, date: now.subtract(10, 'day').format('YYYY-MM-DD'), note: 'Light cycle changed to 12/12' },
  ],
  photoUrl: null,
};

const MOCK_ACTIVITY = [
  { date: now.subtract(45, 'day').toISOString(), action: 'Plant registered', user: 'Thabo M.', detail: 'Clone from PLT-20251120-B2C4' },
  { date: now.subtract(38, 'day').toISOString(), action: 'Stage → Seedling', user: 'Thabo M.', detail: 'Rooted successfully, transplanted' },
  { date: now.subtract(30, 'day').toISOString(), action: 'Inspection passed', user: 'Lindiwe K.', detail: 'Routine compliance check — no issues' },
  { date: now.subtract(24, 'day').toISOString(), action: 'Stage → Vegetative', user: 'Thabo M.', detail: 'Transferred to veg greenhouse' },
  { date: now.subtract(10, 'day').toISOString(), action: 'Stage → Flowering', user: 'Thabo M.', detail: 'Light cycle adjusted to 12/12' },
  { date: now.subtract(3, 'day').toISOString(), action: 'Inspected', user: 'Sipho N.', detail: 'Health check — excellent condition' },
];

const MOCK_LAB_RESULTS = [
  { key: '1', sampleId: 'LAB-20260210-001', labName: 'Cape Analytics', date: '2026-02-10', status: 'passed', thc: 22.4, cbd: 0.8 },
  { key: '2', sampleId: 'LAB-20260118-047', labName: 'SA Cannabis Testing', date: '2026-01-18', status: 'pending', thc: null, cbd: null },
];

const MOCK_TRANSFERS = [
  { key: '1', trackingId: 'TRF-20260201-X9K2', from: 'Nursery A', to: 'GreenFields Farm', date: '2026-02-01', status: 'completed' },
];

const MOCK_DOCUMENTS = [
  { key: '1', name: 'Cultivation License — GreenFields Farm.pdf', type: 'License', uploadedAt: '2026-01-05', size: '1.2 MB' },
  { key: '2', name: 'Lab Certificate — LAB-20260210-001.pdf', type: 'Lab Report', uploadedAt: '2026-02-11', size: '340 KB' },
  { key: '3', name: 'Transfer Manifest — TRF-20260201-X9K2.pdf', type: 'Manifest', uploadedAt: '2026-02-01', size: '520 KB' },
];

const MOCK_AUDIT = [
  { date: now.subtract(45, 'day').toISOString(), user: 'Thabo M.', field: 'record', oldVal: '—', newVal: 'Created', detail: 'Initial plant registration' },
  { date: now.subtract(38, 'day').toISOString(), user: 'Thabo M.', field: 'currentStage', oldVal: 'seed', newVal: 'seedling', detail: 'Stage progression' },
  { date: now.subtract(24, 'day').toISOString(), user: 'Thabo M.', field: 'currentStage', oldVal: 'seedling', newVal: 'vegetative', detail: 'Stage progression' },
  { date: now.subtract(10, 'day').toISOString(), user: 'Thabo M.', field: 'currentStage', oldVal: 'vegetative', newVal: 'flowering', detail: 'Stage progression' },
  { date: now.subtract(3, 'day').toISOString(), user: 'Sipho N.', field: 'notes', oldVal: '—', newVal: 'Health check — excellent', detail: 'Inspection note added' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysActive(plantedDate: string): number {
  return dayjs().diff(dayjs(plantedDate), 'day');
}

function stageDuration(stages: LifecycleStageInfo[], currentStage: PlantStage): string {
  const stageEntry = [...stages].reverse().find((s) => s.stage === currentStage);
  if (!stageEntry?.date) return '—';
  const days = dayjs().diff(dayjs(stageEntry.date), 'day');
  return `${days} days in ${currentStage}`;
}

const STRAIN_TYPE_COLORS: Record<string, string> = {
  indica: 'purple',
  sativa: 'green',
  hybrid: 'blue',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // TODO: Replace with real data fetch — e.g. const { data: plant, isLoading } = usePlant(id);
  const plant: PlantDetail | null = MOCK_PLANT;
  const isLoading = false;

  const active = useMemo(() => (plant ? daysActive(plant.plantedDate) : 0), [plant]);
  const stageDur = useMemo(
    () => (plant ? stageDuration(plant.stages, plant.currentStage) : '—'),
    [plant],
  );

  const isTerminal = plant?.currentStage === 'harvested' || plant?.currentStage === 'destroyed';

  // Dropdown menu items
  const moreMenuItems: MenuProps['items'] = [
    { key: 'edit', label: 'Edit Plant', icon: <Pencil size={14} /> },
    { key: 'stage', label: 'Change Stage', icon: <RefreshCw size={14} /> },
    { key: 'transfer', label: 'Transfer', icon: <ArrowRightLeft size={14} /> },
    { type: 'divider' },
    { key: 'destroy', label: 'Destroy', icon: <Trash2 size={14} />, danger: true },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    // TODO: Implement actions
    console.log('Menu action:', key, 'for plant:', id);
  };

  // --- Lab Results columns ---
  const labColumns = [
    { title: 'Sample ID', dataIndex: 'sampleId', key: 'sampleId' },
    { title: 'Lab', dataIndex: 'labName', key: 'labName' },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <StatusBadge status={s as any} variant="filled" />,
    },
    { title: 'THC %', dataIndex: 'thc', key: 'thc', render: (v: number | null) => (v != null ? `${v}%` : '—') },
    { title: 'CBD %', dataIndex: 'cbd', key: 'cbd', render: (v: number | null) => (v != null ? `${v}%` : '—') },
  ];

  // --- Transfer columns ---
  const transferColumns = [
    { title: 'Transfer ID', dataIndex: 'trackingId', key: 'trackingId' },
    { title: 'From', dataIndex: 'from', key: 'from' },
    { title: 'To', dataIndex: 'to', key: 'to' },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <StatusBadge status={s as any} variant="filled" />,
    },
  ];

  // --- Document columns ---
  const docColumns = [
    { title: 'Document', dataIndex: 'name', key: 'name', render: (n: string) => <a href="#">{n}</a> },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Uploaded', dataIndex: 'uploadedAt', key: 'uploadedAt', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Size', dataIndex: 'size', key: 'size' },
    {
      title: '',
      key: 'actions',
      render: () => (
        <Button type="link" icon={<Download size={14} />} size="small">
          Download
        </Button>
      ),
    },
  ];

  // --- Tabs ---
  const tabItems: TabsProps['items'] = [
    {
      key: 'activity',
      label: 'Activity Log',
      children: (
        <Timeline
          style={{ padding: '16px 0' }}
          items={MOCK_ACTIVITY.map((a) => ({
            children: (
              <div>
                <Text strong>{a.action}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(a.date).format('DD MMM YYYY, HH:mm')} — {a.user}
                </Text>
                <br />
                <Text style={{ fontSize: 13 }}>{a.detail}</Text>
              </div>
            ),
          }))}
        />
      ),
    },
    {
      key: 'lab-results',
      label: 'Lab Results',
      children: (
        <Table
          dataSource={MOCK_LAB_RESULTS}
          columns={labColumns}
          pagination={false}
          size="middle"
          style={{ marginTop: 8 }}
        />
      ),
    },
    {
      key: 'transfers',
      label: 'Transfers',
      children: (
        <Table
          dataSource={MOCK_TRANSFERS}
          columns={transferColumns}
          pagination={false}
          size="middle"
          style={{ marginTop: 8 }}
        />
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      children: (
        <Table
          dataSource={MOCK_DOCUMENTS}
          columns={docColumns}
          pagination={false}
          size="middle"
          style={{ marginTop: 8 }}
        />
      ),
    },
    {
      key: 'audit',
      label: 'Audit Trail',
      children: (
        <Timeline
          style={{ padding: '16px 0' }}
          items={MOCK_AUDIT.map((a) => ({
            children: (
              <div>
                <Text strong>
                  {a.field === 'record' ? 'Record Created' : `${a.field}: ${a.oldVal} → ${a.newVal}`}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(a.date).format('DD MMM YYYY, HH:mm')} — {a.user}
                </Text>
                <br />
                <Text style={{ fontSize: 13 }}>{a.detail}</Text>
              </div>
            ),
          }))}
        />
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Loading / Not Found
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Loading plant details…" />
      </div>
    );
  }

  if (!plant) {
    return (
      <NctsPageContainer title="Plant Not Found">
        <Empty description={`No plant found with ID "${id}"`}>
          <Button type="primary" onClick={() => navigate('/operator/plants')}>
            Back to Plants
          </Button>
        </Empty>
      </NctsPageContainer>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <NctsPageContainer
      title={<><TrackingId id={plant.trackingId} size="lg" /> — {plant.strain}</>}
      subTitle={<StatusBadge status={plant.currentStage as any} size="lg" />}
      extra={
        <Space>
          <PrintButton />
          <Button
            type="primary"
            icon={<Wheat size={16} />}
            disabled={isTerminal}
            onClick={() => {
              // TODO: Open harvest recording modal / navigate to harvest page
              console.log('Record harvest for', plant.trackingId);
            }}
          >
            Record Harvest
          </Button>
          <Dropdown menu={{ items: moreMenuItems, onClick: handleMenuClick }} trigger={['click']}>
            <Button icon={<MoreHorizontal size={16} />} />
          </Dropdown>
        </Space>
      }
    >
      {/* ── Breadcrumb & Status Row ──────────────────────────────── */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Breadcrumb
          items={[
            { title: <Link to="/operator/plants">Plants</Link> },
            { title: plant.trackingId },
          ]}
        />
        <StatusBadge status={plant.currentStage as any} size="lg" />
      </div>

      {/* ── Plant Lifecycle Stepper ─────────────────────────────────── */}
      <Card style={{ marginBottom: 24 }}>
        <PlantLifecycle
          currentStage={plant.currentStage}
          stages={plant.stages}
          direction="horizontal"
          showDates
        />
      </Card>

      {/* ── Two-Column Layout ──────────────────────────────────────── */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {/* Left Column — Details */}
        <Col xl={14} xs={24}>
          <Card title="Plant Details" style={{ height: '100%' }}>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Tracking ID">
                <TrackingId id={plant.trackingId} copyable />
              </Descriptions.Item>
              <Descriptions.Item label="Strain">
                {plant.strain}{' '}
                <Tag color={STRAIN_TYPE_COLORS[plant.strainType]} style={{ marginLeft: 8 }}>
                  {plant.strainType.charAt(0).toUpperCase() + plant.strainType.slice(1)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Source">
                {plant.sourceType === 'clone' ? 'Clone' : plant.sourceType === 'seed' ? 'Seed' : 'Mother Plant'}
                {plant.motherPlantId && (
                  <>
                    {' — '}
                    <Link to={`/operator/plants/${plant.motherPlantId}`}>
                      <TrackingId id={plant.motherPlantId} size="sm" />
                    </Link>
                  </>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Facility">
                <Link to={`/operator/facilities`}>{plant.facilityName}</Link>
              </Descriptions.Item>
              <Descriptions.Item label="Growing Zone">{plant.growingZone}</Descriptions.Item>
              <Descriptions.Item label="Growing Medium">{plant.growingMedium}</Descriptions.Item>
              <Descriptions.Item label="Planted Date">
                {dayjs(plant.plantedDate).format('DD MMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Days Active">
                <Tag color="blue">{active} days</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Current Stage">
                <StatusBadge status={plant.currentStage as any} />
              </Descriptions.Item>
              <Descriptions.Item label="Stage Duration">{stageDur}</Descriptions.Item>
              <Descriptions.Item label="Physical Tag">
                <Tag>{plant.physicalTagType}</Tag> {plant.physicalTagNumber}
              </Descriptions.Item>
              <Descriptions.Item label="GPS Coordinates">
                {plant.gpsCoords.lat.toFixed(4)}, {plant.gpsCoords.lng.toFixed(4)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Right Column — QR & Photo */}
        <Col xl={10} xs={24}>
          <Card title="QR Code" style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <QRCode value={plant.trackingId} size={160} />
            </div>
            <Space>
              <PrintButton />
              <Button icon={<Download size={14} />}>Download QR</Button>
            </Space>
          </Card>

          <Card title="Plant Photo" style={{ textAlign: 'center' }}>
            {plant.photoUrl ? (
              <img
                src={plant.photoUrl}
                alt={`${plant.strain} — ${plant.trackingId}`}
                style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 16 }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 180,
                  background: '#fafafa',
                  border: '2px dashed #d9d9d9',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  color: '#999',
                  fontSize: 13,
                }}
              >
                No photo available
              </div>
            )}
            <Button
              onClick={() => {
                // TODO: Implement photo upload
                console.log('Update photo for', plant.trackingId);
              }}
            >
              Update Photo
            </Button>
          </Card>
        </Col>
      </Row>

      {/* ── Tabbed Sections ────────────────────────────────────────── */}
      <Card>
        <Tabs defaultActiveKey="activity" items={tabItems} />
      </Card>
    </NctsPageContainer>
  );
}
