/**
 * TransferDetailPage — Individual transfer detail view with timeline, manifest,
 * documents, and context-dependent action buttons.
 *
 * Per FrontEnd.md §3.8 — Transfer Detail View.
 */

import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Tabs,
  Button,
  Tag,
  Table,
  Typography,
  Breadcrumb,
  Space,
  Spin,
  Empty,
  Row,
  Col,
  Descriptions,
  QRCode,
  Divider,
  message,
} from 'antd';
import type { TabsProps } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Truck,
  ArrowRight,
  Check,
  XCircle,
  Pencil,
  Trash2,
  Send,
  Download,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import {
  StatusBadge,
  TrackingId,
  NctsPageContainer,
  TransferTimeline,
} from '@ncts/ui';
import type { TransferStatus } from '@ncts/ui';

dayjs.extend(relativeTime);

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransferDetail {
  id: string;
  trackingId: string;
  direction: 'outgoing' | 'incoming';
  fromFacility: string;
  toFacility: string;
  status: TransferStatus;
  createdAt: string;
  estimatedArrival: string;
  vehicleReg: string | null;
  driverName: string | null;
  driverIdNumber: string | null;
  plannedRoute: string | null;
  securityMeasures: string[];
}

interface ManifestItem {
  key: string;
  trackingId: string;
  strain: string;
  weightGrams: number;
  stage: string;
}

interface TimelineEvent {
  date: string;
  action: string;
  user: string;
  detail: string;
}

interface TransferDocument {
  key: string;
  name: string;
  type: string;
  uploadedAt: string;
  size: string;
}

// ---------------------------------------------------------------------------
// Mock Data — TODO: Replace with real API hooks
// ---------------------------------------------------------------------------

const MOCK_TRANSFER: TransferDetail = {
  id: '1',
  trackingId: 'TRF-20260218-A1B2',
  direction: 'outgoing',
  fromFacility: 'Cape Town Indoor — Western Cape',
  toFacility: 'Johannesburg Greenhouse — Gauteng',
  status: 'initiated',
  createdAt: '2026-02-18T09:30:00Z',
  estimatedArrival: '2026-02-22T14:00:00Z',
  vehicleReg: 'CA 123-456',
  driverName: 'John Dlamini',
  driverIdNumber: '8501015009083',
  plannedRoute: 'N1 via Bloemfontein',
  securityMeasures: ['GPS tracking', 'Sealed container'],
};

const MOCK_TIMELINE: TimelineEvent[] = [
  { date: '2026-02-18T09:30:00Z', action: 'Transfer Created', user: 'Thabo M.', detail: 'Draft transfer created with 12 plants' },
  { date: '2026-02-18T10:15:00Z', action: 'Transfer Initiated', user: 'Thabo M.', detail: 'Transfer submitted for processing' },
  { date: '2026-02-18T11:00:00Z', action: 'Vehicle Assigned', user: 'Thabo M.', detail: 'CA 123-456, Driver: John Dlamini' },
];

const MOCK_MANIFEST: ManifestItem[] = [
  { key: '1', trackingId: 'PLT-20260101-AA11', strain: 'Durban Poison', weightGrams: 320, stage: 'Flowering' },
  { key: '2', trackingId: 'PLT-20260105-BB22', strain: 'Swazi Gold', weightGrams: 280, stage: 'Vegetative' },
  { key: '3', trackingId: 'PLT-20260110-CC33', strain: 'Malawi Gold', weightGrams: 410, stage: 'Harvested' },
  { key: '4', trackingId: 'PLT-20260112-DD44', strain: 'Rooibaard', weightGrams: 195, stage: 'Flowering' },
  { key: '5', trackingId: 'PLT-20260115-EE55', strain: 'Power Plant', weightGrams: 350, stage: 'Vegetative' },
];

const MOCK_DOCUMENTS: TransferDocument[] = [
  { key: '1', name: 'Shipping Manifest — TRF-20260218-A1B2.pdf', type: 'Manifest', uploadedAt: '2026-02-18', size: '430 KB' },
  { key: '2', name: 'Lab CoA — Batch 2026-0142.pdf', type: 'Certificate', uploadedAt: '2026-02-17', size: '1.2 MB' },
  { key: '3', name: 'Security Clearance.pdf', type: 'Clearance', uploadedAt: '2026-02-18', size: '210 KB' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns action buttons based on current transfer status */
function getStatusActions(
  status: TransferStatus,
  direction: 'outgoing' | 'incoming',
  onAction: (action: string) => void,
): React.ReactNode[] {
  switch (status) {
    case 'draft':
      return [
        <Button key="edit" icon={<Pencil size={14} />} onClick={() => onAction('edit')}>Edit</Button>,
        <Button key="submit" type="primary" icon={<Send size={14} />} onClick={() => onAction('submit')}>Submit</Button>,
        <Button key="delete" danger icon={<Trash2 size={14} />} onClick={() => onAction('delete')}>Delete</Button>,
      ];
    case 'initiated':
      return [
        <Button key="edit-manifest" icon={<Pencil size={14} />} onClick={() => onAction('edit-manifest')}>Edit Manifest</Button>,
        <Button key="cancel" danger icon={<XCircle size={14} />} onClick={() => onAction('cancel')}>Cancel</Button>,
      ];
    case 'dispatched':
      return [
        <Button key="update-vehicle" icon={<Truck size={14} />} onClick={() => onAction('update-vehicle')}>Update Vehicle Info</Button>,
      ];
    case 'in_transit':
      return []; // view only
    case 'received':
      if (direction === 'incoming') {
        return [
          <Button key="verify" type="primary" icon={<Check size={14} />} onClick={() => onAction('verify')}>Verify Manifest</Button>,
          <Button key="discrepancy" danger icon={<AlertTriangle size={14} />} onClick={() => onAction('discrepancy')}>Report Discrepancy</Button>,
        ];
      }
      return [];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // TODO: Replace with real data fetch — e.g. const { data, isLoading } = useTransfer(id);
  const transfer: TransferDetail | null = MOCK_TRANSFER;
  const isLoading = false;

  const totalWeight = useMemo(
    () => MOCK_MANIFEST.reduce((s, p) => s + p.weightGrams, 0),
    [],
  );

  const handleAction = (action: string) => {
    message.info(`Action: ${action} — TODO: implement`);
  };

  // --- Manifest table columns ---
  const manifestColumns = [
    {
      title: 'Tracking ID',
      dataIndex: 'trackingId',
      key: 'trackingId',
      render: (v: string) => <TrackingId id={v} size="sm" linkTo={`/plants/${v}`} />,
    },
    { title: 'Strain', dataIndex: 'strain', key: 'strain' },
    {
      title: 'Weight (g)',
      dataIndex: 'weightGrams',
      key: 'weightGrams',
      render: (v: number) => `${v} g`,
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (s: string) => <StatusBadge status={s.toLowerCase() as any} variant="dot" />,
    },
  ];

  // --- Document table columns ---
  const docColumns = [
    { title: 'Document', dataIndex: 'name', key: 'name', render: (n: string) => <a href="#">{n}</a> },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    {
      title: 'Uploaded',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: (d: string) => dayjs(d).format('DD MMM YYYY'),
    },
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
      key: 'timeline',
      label: 'Transfer Timeline',
      children: (
        <TransferTimeline
          events={MOCK_TIMELINE.map((ev) => ({
            stage: ev.action.includes('Created')
              ? 'initiated' as const
              : ev.action.includes('Initiated')
                ? 'dispatched' as const
                : ev.action.includes('Vehicle')
                  ? 'in_transit' as const
                  : 'received' as const,
            timestamp: ev.date,
            actor: ev.user,
            note: ev.detail,
          }))}
          currentStage={transfer.status}
          showActors
        />
      ),
    },
    {
      key: 'manifest',
      label: `Manifest (${MOCK_MANIFEST.length} items)`,
      children: (
        <div>
          <Table
            dataSource={MOCK_MANIFEST}
            columns={manifestColumns}
            pagination={false}
            size="middle"
            style={{ marginTop: 8 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong>{totalWeight} g</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
            )}
          />
        </div>
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
  ];

  // ---------------------------------------------------------------------------
  // Loading / Not Found
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Loading transfer details…" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <NctsPageContainer title="Transfer Not Found">
        <Empty description={`No transfer found with ID "${id}"`}>
          <Button type="primary" onClick={() => navigate('/operator/transfers')}>
            Back to Transfers
          </Button>
        </Empty>
      </NctsPageContainer>
    );
  }

  const actionButtons = getStatusActions(transfer.status, transfer.direction, handleAction);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <NctsPageContainer
      title={<><TrackingId id={transfer.trackingId} size="lg" /></>}
      subTitle={<StatusBadge status={transfer.status} size="lg" />}
      extra={
        <Space>
          {actionButtons}
        </Space>
      }
    >
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: <Link to="/operator/transfers">Transfers</Link> },
            { title: transfer.trackingId },
          ]}
        />
      </div>

      {/* Transfer Header Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xl={16} xs={24}>
          <Card title="Transfer Details">
            <Descriptions bordered column={{ xl: 2, md: 1, sm: 1 }} size="middle">
              <Descriptions.Item label="Transfer ID">
                <TrackingId id={transfer.trackingId} copyable />
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusBadge status={transfer.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Direction">
                {transfer.direction === 'outgoing' ? (
                  <Tag color="blue">↑ Outgoing</Tag>
                ) : (
                  <Tag color="green">↓ Incoming</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(transfer.createdAt).format('DD MMM YYYY, HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="From Facility">
                {transfer.fromFacility}
              </Descriptions.Item>
              <Descriptions.Item label="To Facility">
                <Space>
                  <ArrowRight size={14} />
                  {transfer.toFacility}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Estimated Arrival">
                {dayjs(transfer.estimatedArrival).format('DD MMM YYYY, HH:mm')}
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({dayjs(transfer.estimatedArrival).fromNow()})
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Items">
                {MOCK_MANIFEST.length} plants — {totalWeight} g total
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ marginTop: 24 }}>Transport Info</Divider>
            <Descriptions bordered column={{ xl: 2, md: 1, sm: 1 }} size="middle">
              <Descriptions.Item label="Vehicle">
                {transfer.vehicleReg ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Driver">
                {transfer.driverName ?? '—'}
                {transfer.driverIdNumber && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    (ID: {transfer.driverIdNumber})
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Planned Route">
                {transfer.plannedRoute || 'Not specified'}
              </Descriptions.Item>
              <Descriptions.Item label="Security Measures">
                {transfer.securityMeasures.length > 0
                  ? transfer.securityMeasures.map((m) => (
                      <Tag key={m} style={{ marginBottom: 4 }}>{m}</Tag>
                    ))
                  : 'None'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xl={8} xs={24}>
          <Card title="Shipment QR Code" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <QRCode value={transfer.trackingId} size={180} />
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Scan to track shipment
            </Text>
            <Divider />
            <Button icon={<FileText size={14} />} block>
              Download Manifest PDF
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Tabbed Sections */}
      <Card>
        <Tabs defaultActiveKey="timeline" items={tabItems} />
      </Card>
    </NctsPageContainer>
  );
}
