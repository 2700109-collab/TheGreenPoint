/**
 * SaleDetailPage — Individual sale detail view with products table,
 * financial summary, documents, and audit trail.
 *
 * Per FrontEnd.md §3.9 — Sale Detail Page.
 */

import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Tabs,
  Button,
  Tag,
  Timeline,
  Table,
  Typography,
  Breadcrumb,
  Space,
  Spin,
  Empty,
  Row,
  Col,
  Descriptions,
  Divider,
  Statistic,
  message,
} from 'antd';
import type { TabsProps } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  FileText,
  Download,
  XCircle,
} from 'lucide-react';
import {
  StatusBadge,
  TrackingId,
  NctsPageContainer,
  PrintButton,
} from '@ncts/ui';

dayjs.extend(relativeTime);

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaleDetail {
  id: string;
  trackingId: string;
  buyerName: string;
  buyerLicense: string;
  saleDate: string;
  status: string;
  paymentMethod: string;
  invoiceNumber: string | null;
  notes: string;
}

interface SaleProduct {
  key: string;
  trackingId: string;
  strain: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

interface SaleDocument {
  key: string;
  name: string;
  type: string;
  uploadedAt: string;
  size: string;
}

interface AuditEntry {
  date: string;
  user: string;
  field: string;
  oldVal: string;
  newVal: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// Mock Data — TODO: Replace with real API hooks
// ---------------------------------------------------------------------------

const MOCK_SALE: SaleDetail = {
  id: 'sale-1',
  trackingId: 'SAL-20260110-AAA',
  buyerName: 'Verdant Wellness CC',
  buyerLicense: 'LIC-GP-0012',
  saleDate: '2026-01-10',
  status: 'completed',
  paymentMethod: 'Bank Transfer',
  invoiceNumber: 'INV-2026-001',
  notes: '',
};

const MOCK_PRODUCTS: SaleProduct[] = [
  { key: '1', trackingId: 'HRV-20260105-AA11', strain: 'Durban Poison', quantity: 300, unit: 'g', unitPrice: 70, lineTotal: 21000 },
  { key: '2', trackingId: 'HRV-20260108-BB22', strain: 'Swazi Gold', quantity: 200, unit: 'g', unitPrice: 70, lineTotal: 14000 },
];

const MOCK_DOCUMENTS: SaleDocument[] = [
  { key: '1', name: 'Invoice — INV-2026-001.pdf', type: 'Invoice', uploadedAt: '2026-01-10', size: '320 KB' },
  { key: '2', name: 'Proof of Payment — Verdant Wellness.pdf', type: 'Payment', uploadedAt: '2026-01-12', size: '180 KB' },
];

const MOCK_AUDIT: AuditEntry[] = [
  { date: '2026-01-10T09:00:00Z', user: 'Thabo M.', field: 'record', oldVal: '—', newVal: 'Created', detail: 'Sale recorded' },
  { date: '2026-01-10T09:05:00Z', user: 'Thabo M.', field: 'status', oldVal: 'draft', newVal: 'pending', detail: 'Submitted for processing' },
  { date: '2026-01-12T14:30:00Z', user: 'Lindiwe K.', field: 'status', oldVal: 'pending', newVal: 'completed', detail: 'Payment confirmed, sale completed' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatZAR(value: number): string {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // TODO: Replace with real data fetch
  const sale: SaleDetail | null = MOCK_SALE;
  const isLoading = false;

  const subtotal = useMemo(
    () => MOCK_PRODUCTS.reduce((sum, p) => sum + p.lineTotal, 0),
    [],
  );
  const vat = useMemo(() => subtotal * 0.15, [subtotal]);
  const total = useMemo(() => subtotal + vat, [subtotal, vat]);

  // --- Product table columns ---
  const productColumns = [
    {
      title: 'Product ID',
      dataIndex: 'trackingId',
      key: 'trackingId',
      render: (v: string) => <TrackingId id={v} size="sm" />,
    },
    { title: 'Strain', dataIndex: 'strain', key: 'strain' },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (v: number, r: SaleProduct) => `${v} ${r.unit}`,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (v: number) => formatZAR(v),
    },
    {
      title: 'Line Total',
      dataIndex: 'lineTotal',
      key: 'lineTotal',
      render: (v: number) => <Text strong>{formatZAR(v)}</Text>,
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
      key: 'products',
      label: `Products (${MOCK_PRODUCTS.length})`,
      children: (
        <div>
          <Table
            dataSource={MOCK_PRODUCTS}
            columns={productColumns}
            pagination={false}
            size="middle"
            style={{ marginTop: 8 }}
          />

          {/* Financial summary */}
          <div
            style={{
              maxWidth: 360,
              marginLeft: 'auto',
              marginTop: 24,
              padding: '16px 20px',
              background: '#F6FFED',
              border: '1px solid #B7EB8F',
              borderRadius: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>Subtotal</Text>
              <Text strong>{formatZAR(subtotal)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">VAT (15%)</Text>
              <Text type="secondary">{formatZAR(vat)}</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 16 }}>Total</Text>
              <Text strong style={{ fontSize: 16, color: '#007A4D' }}>{formatZAR(total)}</Text>
            </div>
          </div>
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
        <Spin size="large" tip="Loading sale details…" />
      </div>
    );
  }

  if (!sale) {
    return (
      <NctsPageContainer title="Sale Not Found">
        <Empty description={`No sale found with ID "${id}"`}>
          <Button type="primary" onClick={() => navigate('/operator/sales')}>
            Back to Sales
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
      title={<><TrackingId id={sale.trackingId} size="lg" /></>}
      subTitle={<StatusBadge status={sale.status as any} size="lg" />}
      extra={
        <Space>
          <PrintButton />
          <Button icon={<FileText size={14} />} onClick={() => message.info('Generate invoice — TODO')}>
            Invoice
          </Button>
          {sale.status !== 'void' && (
            <Button danger icon={<XCircle size={14} />} onClick={() => message.info('Void sale — TODO')}>
              Void
            </Button>
          )}
        </Space>
      }
    >
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: <Link to="/operator/sales">Sales</Link> },
            { title: sale.trackingId },
          ]}
        />
      </div>

      {/* Sale Header */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xl={16} xs={24}>
          <Card title="Sale Details">
            <Descriptions bordered column={{ xl: 2, md: 1, sm: 1 }} size="middle">
              <Descriptions.Item label="Sale ID">
                <TrackingId id={sale.trackingId} copyable />
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusBadge status={sale.status as any} />
              </Descriptions.Item>
              <Descriptions.Item label="Buyer">
                <Space direction="vertical" size={0}>
                  <Text strong>{sale.buyerName}</Text>
                  <Tag style={{ fontSize: 11, margin: 0 }}>{sale.buyerLicense}</Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Sale Date">
                {dayjs(sale.saleDate).format('DD MMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                {sale.paymentMethod}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Number">
                {sale.invoiceNumber ?? '—'}
              </Descriptions.Item>
              {sale.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {sale.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col xl={8} xs={24}>
          <Card>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="Subtotal" value={subtotal} prefix="R" precision={2} />
              </Col>
              <Col span={12}>
                <Statistic title="VAT (15%)" value={vat} prefix="R" precision={2} />
              </Col>
              <Col span={24}>
                <Divider style={{ margin: '8px 0' }} />
                <Statistic
                  title="Total (incl. VAT)"
                  value={total}
                  prefix="R"
                  precision={2}
                  valueStyle={{ color: '#007A4D', fontSize: 28 }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Tabbed Sections */}
      <Card>
        <Tabs defaultActiveKey="products" items={tabItems} />
      </Card>
    </NctsPageContainer>
  );
}
