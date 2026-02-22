/**
 * OperatorDetailPage — Detailed view for a single cannabis operator.
 * Per FrontEnd.md §4.2.
 */

import { useParams } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Progress,
  Statistic,
  Table,
  Timeline,
  Tabs,
  Button,
  Space,
  Avatar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Ban, Flag, Sprout, Truck, ShoppingCart, ShieldCheck } from 'lucide-react';
import {
  StatusBadge,
  TrackingId,
  NctsPageContainer,
} from '@ncts/ui';

// ---------------------------------------------------------------------------
// Mock Operator — TODO: Replace with API hook using id param
// ---------------------------------------------------------------------------

const MOCK_OPERATOR = {
  id: 'op-1',
  name: 'GreenPoint Cannabis (Pty) Ltd',
  registrationNumber: 'OPR-20250115-GPC',
  licenseType: 'cultivation' as const,
  contactPerson: 'James Mokoena',
  email: 'james@greenpoint.co.za',
  phone: '+27 11 234 5678',
  address: '123 Cannabis Way, Sandton',
  province: 'Gauteng',
  memberSince: '2025-01-15',
  complianceScore: 92,
  activePlants: 12450,
  permitStatus: 'active' as const,
};

// ---------------------------------------------------------------------------
// Facilities mock data
// ---------------------------------------------------------------------------

const MOCK_FACILITIES = [
  { key: '1', name: 'Sandton Grow House', type: 'Indoor', plants: 5200, status: 'active' },
  { key: '2', name: 'Midrand Processing', type: 'Processing', plants: 0, status: 'active' },
  { key: '3', name: 'Pretoria Nursery', type: 'Greenhouse', plants: 7250, status: 'pending_approval' },
];

// ---------------------------------------------------------------------------
// Plants mock data
// ---------------------------------------------------------------------------

const MOCK_PLANTS = [
  { key: '1', trackingId: 'PLT-20260101-AAB', strain: 'Charlotte\'s Web', stage: 'flowering', facility: 'Sandton Grow House' },
  { key: '2', trackingId: 'PLT-20260103-CDE', strain: 'ACDC', stage: 'vegetative', facility: 'Sandton Grow House' },
  { key: '3', trackingId: 'PLT-20260107-FGH', strain: 'Harlequin', stage: 'seedling', facility: 'Pretoria Nursery' },
  { key: '4', trackingId: 'PLT-20260110-IJK', strain: 'Cannatonic', stage: 'harvested', facility: 'Sandton Grow House' },
  { key: '5', trackingId: 'PLT-20260115-LMN', strain: 'Ringo\'s Gift', stage: 'vegetative', facility: 'Pretoria Nursery' },
];

// ---------------------------------------------------------------------------
// Permits mock data
// ---------------------------------------------------------------------------

const MOCK_PERMITS = [
  { key: '1', permitNumber: 'PRM-20250115-CUL', type: 'Cultivation', status: 'active', expiry: '2027-01-15' },
  { key: '2', permitNumber: 'PRM-20250320-PRO', type: 'Processing', status: 'pending', expiry: '2027-03-20' },
];

// ---------------------------------------------------------------------------
// Transfers mock data
// ---------------------------------------------------------------------------

const MOCK_TRANSFERS = [
  { key: '1', id: 'TRF-20260210-KZN', direction: 'Outbound', status: 'verified', date: '2026-02-10' },
  { key: '2', id: 'TRF-20260205-CPT', direction: 'Inbound', status: 'in_transit', date: '2026-02-05' },
  { key: '3', id: 'TRF-20260130-JHB', direction: 'Outbound', status: 'received', date: '2026-01-30' },
];

// ---------------------------------------------------------------------------
// Sales mock data
// ---------------------------------------------------------------------------

const MOCK_SALES = [
  { key: '1', id: 'SAL-20260218-001', buyer: 'MedLeaf Distribution', amount: 'R 84,500', date: '2026-02-18' },
  { key: '2', id: 'SAL-20260212-002', buyer: 'Cape Wellness Co', amount: 'R 62,000', date: '2026-02-12' },
  { key: '3', id: 'SAL-20260201-003', buyer: 'Joburg Pharma', amount: 'R 128,750', date: '2026-02-01' },
];

// ---------------------------------------------------------------------------
// Compliance timeline
// ---------------------------------------------------------------------------

const COMPLIANCE_EVENTS = [
  { color: 'green' as const, children: 'Annual compliance audit passed — 92% score (15 Feb 2026)' },
  { color: 'blue' as const, children: 'Facility inspection completed — Sandton Grow House (01 Feb 2026)' },
  { color: 'orange' as const, children: 'Minor finding: updated SOPs required for drying room (15 Jan 2026)' },
  { color: 'green' as const, children: 'Corrective action verified — packaging labels updated (10 Jan 2026)' },
];

// ---------------------------------------------------------------------------
// Audit timeline
// ---------------------------------------------------------------------------

const AUDIT_EVENTS = [
  { color: 'blue' as const, children: 'Profile updated by Admin — Thabo Nkosi (21 Feb 2026)' },
  { color: 'green' as const, children: 'New plant batch registered — 250 seedlings (18 Feb 2026)' },
  { color: 'blue' as const, children: 'Transfer TRF-20260210-KZN completed (10 Feb 2026)' },
  { color: 'gray' as const, children: 'Monthly compliance report submitted (01 Feb 2026)' },
];

// ---------------------------------------------------------------------------
// Stage / Status color helpers
// ---------------------------------------------------------------------------

const STAGE_COLOR: Record<string, string> = {
  seed: 'default',
  seedling: 'lime',
  vegetative: 'green',
  flowering: 'purple',
  harvested: 'gold',
  destroyed: 'red',
};

const DIRECTION_COLOR: Record<string, string> = {
  Inbound: 'cyan',
  Outbound: 'blue',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OperatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const op = MOCK_OPERATOR; // TODO: fetch by id from API

  // Suppress unused lint for route param — will be used with real API
  void id;

  // -- Facility columns -----------------------------------------------------
  const facilityColumns: ColumnsType<(typeof MOCK_FACILITIES)[number]> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 120, render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Plants', dataIndex: 'plants', key: 'plants', width: 100, render: (v: number) => v.toLocaleString() },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 140,
      render: (v: string) => <StatusBadge status={v as any} />,
    },
  ];

  // -- Plant columns (ProTable with search/filter) -------------------------
  const plantColumns: ProColumns<(typeof MOCK_PLANTS)[number]>[] = [
    {
      title: 'Tracking ID',
      dataIndex: 'trackingId',
      width: 180,
      render: (_, r) => <TrackingId id={r.trackingId} size="sm" copyable />,
    },
    {
      title: 'Strain',
      dataIndex: 'strain',
      width: 150,
      filters: true,
      valueEnum: {
        "Charlotte's Web": { text: "Charlotte's Web" },
        ACDC: { text: 'ACDC' },
        Harlequin: { text: 'Harlequin' },
        Cannatonic: { text: 'Cannatonic' },
        "Ringo's Gift": { text: "Ringo's Gift" },
      },
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      width: 120,
      filters: true,
      valueEnum: {
        seedling: { text: 'Seedling' },
        vegetative: { text: 'Vegetative' },
        flowering: { text: 'Flowering' },
        harvested: { text: 'Harvested' },
        destroyed: { text: 'Destroyed' },
      },
      render: (_, r) => (
        <Tag color={STAGE_COLOR[r.stage] ?? 'default'}>
          {r.stage.charAt(0).toUpperCase() + r.stage.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Facility',
      dataIndex: 'facility',
      width: 180,
      filters: true,
      valueEnum: {
        'Sandton Grow House': { text: 'Sandton Grow House' },
        'Pretoria Nursery': { text: 'Pretoria Nursery' },
        'Midrand Processing': { text: 'Midrand Processing' },
      },
    },
  ];

  // -- Permit columns -------------------------------------------------------
  const permitColumns: ColumnsType<(typeof MOCK_PERMITS)[number]> = [
    { title: 'Permit #', dataIndex: 'permitNumber', key: 'permitNumber', width: 180, render: (v: string) => <TrackingId id={v} size="sm" copyable /> },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 120, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v: string) => <StatusBadge status={v as any} /> },
    { title: 'Expiry', dataIndex: 'expiry', key: 'expiry', width: 120, render: (v: string) => dayjs(v).format('DD MMM YYYY') },
  ];

  // -- Transfer columns -----------------------------------------------------
  const transferColumns: ColumnsType<(typeof MOCK_TRANSFERS)[number]> = [
    { title: 'Transfer ID', dataIndex: 'id', key: 'id', width: 180, render: (v: string) => <TrackingId id={v} size="sm" copyable /> },
    { title: 'Direction', dataIndex: 'direction', key: 'direction', width: 120, render: (v: string) => <Tag color={DIRECTION_COLOR[v] ?? 'default'}>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v: string) => <StatusBadge status={v as any} /> },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 120, render: (v: string) => dayjs(v).format('DD MMM YYYY') },
  ];

  // -- Sales columns --------------------------------------------------------
  const salesColumns: ColumnsType<(typeof MOCK_SALES)[number]> = [
    { title: 'Sale ID', dataIndex: 'id', key: 'id', width: 180, render: (v: string) => <TrackingId id={v} size="sm" copyable /> },
    { title: 'Buyer', dataIndex: 'buyer', key: 'buyer', width: 180 },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 120, render: (v: string) => dayjs(v).format('DD MMM YYYY') },
  ];

  // -- Bottom Tabs ----------------------------------------------------------
  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Card><Statistic title="Facilities" value={3} prefix={<Sprout size={16} />} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Active Plants" value={12450} prefix={<Sprout size={16} />} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Transfers (YTD)" value={24} prefix={<Truck size={16} />} /></Card></Col>
          <Col xs={12} sm={6}><Card><Statistic title="Sales (YTD)" value="R 1.2M" prefix={<ShoppingCart size={16} />} /></Card></Col>
        </Row>
      ),
    },
    {
      key: 'facilities',
      label: 'Facilities',
      children: <Table dataSource={MOCK_FACILITIES} columns={facilityColumns} pagination={false} size="small" />,
    },
    {
      key: 'plants',
      label: 'Plants',
      children: (
        <ProTable
          dataSource={MOCK_PLANTS}
          columns={plantColumns}
          rowKey="key"
          search={{ filterType: 'light' }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          options={{ density: true, reload: false, setting: true }}
          toolBarRender={false}
          size="small"
        />
      ),
    },
    {
      key: 'permits',
      label: 'Permits',
      children: <Table dataSource={MOCK_PERMITS} columns={permitColumns} pagination={false} size="small" />,
    },
    {
      key: 'transfers',
      label: 'Transfers',
      children: <Table dataSource={MOCK_TRANSFERS} columns={transferColumns} pagination={false} size="small" />,
    },
    {
      key: 'sales',
      label: 'Sales',
      children: <Table dataSource={MOCK_SALES} columns={salesColumns} pagination={false} size="small" />,
    },
    {
      key: 'compliance',
      label: 'Compliance',
      children: (
        <Card title="Compliance History">
          <Timeline items={COMPLIANCE_EVENTS} />
        </Card>
      ),
    },
    {
      key: 'audit',
      label: 'Audit Log',
      children: (
        <Card title="Recent Audit Events">
          <Timeline items={AUDIT_EVENTS} />
        </Card>
      ),
    },
  ];

  // -- Render ---------------------------------------------------------------
  return (
    <NctsPageContainer
      title={op.name}
      subTitle={op.registrationNumber}
      extra={
        <Space>
          <StatusBadge status={op.permitStatus as any} />
          <Button icon={<Ban size={14} />} style={{ color: '#faad14', borderColor: '#faad14' }}>Suspend</Button>
          <Button danger icon={<Flag size={14} />}>Flag</Button>
        </Space>
      }
    >
      {/* Top section */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} xl={16}>
          <Card title="Operator Details">
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Company Name">{op.name}</Descriptions.Item>
              <Descriptions.Item label="Registration #"><TrackingId id={op.registrationNumber} size="sm" copyable /></Descriptions.Item>
              <Descriptions.Item label="License Type"><Tag color="green">{op.licenseType.charAt(0).toUpperCase() + op.licenseType.slice(1)}</Tag></Descriptions.Item>
              <Descriptions.Item label="Contact Person">{op.contactPerson}</Descriptions.Item>
              <Descriptions.Item label="Email">{op.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{op.phone}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{op.address}</Descriptions.Item>
              <Descriptions.Item label="Province">{op.province}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card style={{ textAlign: 'center' }}>
            <Avatar size={64} style={{ backgroundColor: '#1677ff', fontSize: 28, marginBottom: 12 }}>
              {op.name.charAt(0)}
            </Avatar>
            <div style={{ color: '#8c8c8c', marginBottom: 16 }}>Member since {dayjs(op.memberSince).format('DD MMM YYYY')}</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                <ShieldCheck size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Compliance Score
              </div>
              <Progress type="circle" percent={op.complianceScore} size={100} strokeColor={op.complianceScore >= 90 ? '#52c41a' : op.complianceScore >= 70 ? '#faad14' : '#ff4d4f'} />
            </div>
            <Statistic title="Active Plants" value={op.activePlants.toLocaleString()} />
          </Card>
        </Col>
      </Row>

      {/* Bottom tabs */}
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </NctsPageContainer>
  );
}
