/**
 * TransfersPage — Transfer management with ProTable, tab filtering, and Create Transfer wizard.
 *
 * Per FrontEnd.md §3.8.
 */

import { useState, useMemo, useCallback } from 'react';
import { Button, Tabs, Tag, Modal, Space, Descriptions, Checkbox, Table, QRCode, message } from 'antd';
import type { TabsProps } from 'antd';
import { ProTable, StepsForm, ProFormText, ProFormSelect, ProFormDatePicker, ProFormTextArea } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Plus, Truck, Eye, X, Check, XCircle } from 'lucide-react';
import {
  StatusBadge,
  TrackingId,
  NctsPageContainer,
  CsvExportButton,
} from '@ncts/ui';
import type { TransferStatus } from '@ncts/ui';

dayjs.extend(relativeTime);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Direction = 'outgoing' | 'incoming';

interface Transfer {
  id: string;
  trackingId: string;
  direction: Direction;
  fromFacility: string;
  toFacility: string;
  itemCount: number;
  weightGrams: number | null;
  status: TransferStatus;
  createdAt: string;
  estimatedArrival: string;
  vehicleReg: string | null;
  driverName: string | null;
}

interface ManifestPlant {
  id: string;
  trackingId: string;
  strain: string;
  weightGrams: number;
  stage: string;
}

// ---------------------------------------------------------------------------
// Mock Data — TODO: Replace with API hooks (e.g. useTransfers from @ncts/api-client)
// ---------------------------------------------------------------------------

const MOCK_TRANSFERS: Transfer[] = [
  {
    id: '1', trackingId: 'TRF-20260218-A1B2', direction: 'outgoing',
    fromFacility: 'Cape Town Indoor', toFacility: 'Johannesburg Greenhouse',
    itemCount: 12, weightGrams: null, status: 'initiated',
    createdAt: '2026-02-18T09:30:00Z', estimatedArrival: '2026-02-22T14:00:00Z',
    vehicleReg: 'CA 123-456', driverName: 'John Dlamini',
  },
  {
    id: '2', trackingId: 'TRF-20260217-C3D4', direction: 'incoming',
    fromFacility: 'Durban Outdoor', toFacility: 'Cape Town Indoor',
    itemCount: 8, weightGrams: null, status: 'in_transit',
    createdAt: '2026-02-17T11:00:00Z', estimatedArrival: '2026-02-21T16:00:00Z',
    vehicleReg: 'ND 789-012', driverName: 'Sipho Nkosi',
  },
  {
    id: '3', trackingId: 'TRF-20260215-E5F6', direction: 'outgoing',
    fromFacility: 'Cape Town Indoor', toFacility: 'Stellenbosch Processing',
    itemCount: 5, weightGrams: 2400, status: 'received',
    createdAt: '2026-02-15T08:15:00Z', estimatedArrival: '2026-02-16T10:00:00Z',
    vehicleReg: 'CA 456-789', driverName: 'Pieter van der Merwe',
  },
  {
    id: '4', trackingId: 'TRF-20260214-G7H8', direction: 'incoming',
    fromFacility: 'Johannesburg Greenhouse', toFacility: 'Cape Town Indoor',
    itemCount: 20, weightGrams: null, status: 'verified',
    createdAt: '2026-02-14T14:45:00Z', estimatedArrival: '2026-02-17T09:00:00Z',
    vehicleReg: 'GP 321-654', driverName: 'Thabo Mokoena',
  },
  {
    id: '5', trackingId: 'TRF-20260213-I9J0', direction: 'outgoing',
    fromFacility: 'Cape Town Indoor', toFacility: 'Durban Outdoor',
    itemCount: 3, weightGrams: 1100, status: 'dispatched',
    createdAt: '2026-02-13T10:00:00Z', estimatedArrival: '2026-02-20T12:00:00Z',
    vehicleReg: 'CA 654-321', driverName: 'André Botha',
  },
  {
    id: '6', trackingId: 'TRF-20260210-K1L2', direction: 'incoming',
    fromFacility: 'Stellenbosch Processing', toFacility: 'Cape Town Indoor',
    itemCount: 15, weightGrams: null, status: 'rejected',
    createdAt: '2026-02-10T13:20:00Z', estimatedArrival: '2026-02-11T15:00:00Z',
    vehicleReg: 'CA 987-654', driverName: 'Lindiwe Zulu',
  },
  {
    id: '7', trackingId: 'TRF-20260209-M3N4', direction: 'outgoing',
    fromFacility: 'Cape Town Indoor', toFacility: 'Johannesburg Greenhouse',
    itemCount: 7, weightGrams: null, status: 'cancelled',
    createdAt: '2026-02-09T07:50:00Z', estimatedArrival: '2026-02-12T11:00:00Z',
    vehicleReg: null, driverName: null,
  },
  {
    id: '8', trackingId: 'TRF-20260221-O5P6', direction: 'outgoing',
    fromFacility: 'Cape Town Indoor', toFacility: 'Durban Outdoor',
    itemCount: 10, weightGrams: null, status: 'draft',
    createdAt: '2026-02-21T06:00:00Z', estimatedArrival: '2026-02-25T14:00:00Z',
    vehicleReg: null, driverName: null,
  },
  {
    id: '9', trackingId: 'TRF-20260220-Q7R8', direction: 'incoming',
    fromFacility: 'Durban Outdoor', toFacility: 'Cape Town Indoor',
    itemCount: 6, weightGrams: null, status: 'initiated',
    createdAt: '2026-02-20T15:30:00Z', estimatedArrival: '2026-02-24T10:00:00Z',
    vehicleReg: 'ND 111-222', driverName: 'Bongani Mthembu',
  },
  {
    id: '10', trackingId: 'TRF-20260219-S9T0', direction: 'outgoing',
    fromFacility: 'Cape Town Indoor', toFacility: 'Stellenbosch Processing',
    itemCount: 4, weightGrams: 1800, status: 'in_transit',
    createdAt: '2026-02-19T12:10:00Z', estimatedArrival: '2026-02-21T08:00:00Z',
    vehicleReg: 'CA 333-444', driverName: 'Kobus Pretorius',
  },
];

// TODO: Replace with API call to fetch plants from source facility
const MOCK_SOURCE_PLANTS: ManifestPlant[] = [
  { id: 'p1', trackingId: 'PLT-20260101-AA11', strain: 'Durban Poison', weightGrams: 320, stage: 'Flowering' },
  { id: 'p2', trackingId: 'PLT-20260105-BB22', strain: 'Swazi Gold', weightGrams: 280, stage: 'Vegetative' },
  { id: 'p3', trackingId: 'PLT-20260110-CC33', strain: 'Malawi Gold', weightGrams: 410, stage: 'Harvested' },
  { id: 'p4', trackingId: 'PLT-20260112-DD44', strain: 'Rooibaard', weightGrams: 195, stage: 'Flowering' },
  { id: 'p5', trackingId: 'PLT-20260115-EE55', strain: 'Power Plant', weightGrams: 350, stage: 'Vegetative' },
];

// TODO: Replace with API call to fetch facilities
const MOCK_FACILITIES = [
  { value: 'fac-001', label: 'Cape Town Indoor — Western Cape' },
  { value: 'fac-002', label: 'Johannesburg Greenhouse — Gauteng' },
  { value: 'fac-003', label: 'Durban Outdoor — KwaZulu-Natal' },
  { value: 'fac-004', label: 'Stellenbosch Processing — Western Cape' },
];

const SECURITY_OPTIONS = [
  { label: 'GPS tracking', value: 'gps_tracking' },
  { label: 'Sealed container', value: 'sealed_container' },
  { label: 'Armed escort', value: 'armed_escort' },
  { label: 'Temperature controlled', value: 'temperature_controlled' },
];

const PENDING_STATUSES: TransferStatus[] = ['initiated', 'dispatched', 'in_transit'];

// ---------------------------------------------------------------------------
// CSV export columns
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { key: 'trackingId', header: 'Transfer ID' },
  { key: 'direction', header: 'Direction' },
  { key: 'fromFacility', header: 'From Facility' },
  { key: 'toFacility', header: 'To Facility' },
  { key: 'itemCount', header: 'Items' },
  { key: 'status', header: 'Status' },
  { key: 'createdAt', header: 'Created' },
  { key: 'estimatedArrival', header: 'ETA' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TransfersPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedPlantKeys, setSelectedPlantKeys] = useState<React.Key[]>([]);
  const [securityMeasures, setSecurityMeasures] = useState<string[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [wizardFormData, setWizardFormData] = useState<Record<string, any>>({});

  // ---------------------------------------------------------------------------
  // Derived counts — TODO: derive from API response meta
  // ---------------------------------------------------------------------------

  const outCount = useMemo(() => MOCK_TRANSFERS.filter((t) => t.direction === 'outgoing').length, []);
  const inCount = useMemo(() => MOCK_TRANSFERS.filter((t) => t.direction === 'incoming').length, []);
  const pendingCount = useMemo(
    () => MOCK_TRANSFERS.filter((t) => PENDING_STATUSES.includes(t.status)).length,
    [],
  );
  const total = MOCK_TRANSFERS.length;

  // ---------------------------------------------------------------------------
  // Filtered data
  // ---------------------------------------------------------------------------

  const filteredData = useMemo(() => {
    switch (activeTab) {
      case 'outgoing':
        return MOCK_TRANSFERS.filter((t) => t.direction === 'outgoing');
      case 'incoming':
        return MOCK_TRANSFERS.filter((t) => t.direction === 'incoming');
      case 'pending':
        return MOCK_TRANSFERS.filter((t) => PENDING_STATUSES.includes(t.status));
      default:
        return MOCK_TRANSFERS;
    }
  }, [activeTab]);

  // ---------------------------------------------------------------------------
  // Wizard handlers
  // ---------------------------------------------------------------------------

  const openWizard = useCallback(() => {
    setWizardOpen(true);
    setSelectedPlantKeys([]);
    setSecurityMeasures([]);
    setAuthorized(false);
    setWizardFormData({});
  }, []);

  const closeWizard = useCallback(() => setWizardOpen(false), []);

  const selectedPlants = useMemo(
    () => MOCK_SOURCE_PLANTS.filter((p) => selectedPlantKeys.includes(p.id)),
    [selectedPlantKeys],
  );

  // ---------------------------------------------------------------------------
  // ProTable columns
  // ---------------------------------------------------------------------------

  const columns: ProColumns<Transfer>[] = [
    {
      title: 'Transfer ID',
      dataIndex: 'trackingId',
      width: 180,
      render: (_, record) => (
        <TrackingId id={record.trackingId} linkTo={`/transfers/${record.trackingId}`} copyable size="sm" />
      ),
    },
    {
      title: 'Direction',
      dataIndex: 'direction',
      width: 80,
      render: (_, record) =>
        record.direction === 'outgoing' ? (
          <Tag color="blue" style={{ margin: 0 }}>↑ Out</Tag>
        ) : (
          <Tag color="green" style={{ margin: 0 }}>↓ In</Tag>
        ),
      valueEnum: { outgoing: { text: 'Outgoing' }, incoming: { text: 'Incoming' } },
    },
    {
      title: 'From Facility',
      dataIndex: 'fromFacility',
      width: 170,
      ellipsis: true,
    },
    {
      title: 'To Facility',
      dataIndex: 'toFacility',
      width: 170,
      ellipsis: true,
    },
    {
      title: 'Items',
      dataIndex: 'itemCount',
      width: 80,
      search: false,
      render: (_, record) =>
        record.weightGrams
          ? `${record.weightGrams}g`
          : `${record.itemCount} plants`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      render: (_, record) => <StatusBadge status={record.status} />,
      valueEnum: {
        draft: { text: 'Draft' },
        initiated: { text: 'Initiated' },
        dispatched: { text: 'Dispatched' },
        in_transit: { text: 'In Transit' },
        received: { text: 'Received' },
        verified: { text: 'Verified' },
        rejected: { text: 'Rejected' },
        cancelled: { text: 'Cancelled' },
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 120,
      search: false,
      render: (_, record) => dayjs(record.createdAt).format('DD MMM YYYY'),
    },
    {
      title: 'ETA',
      dataIndex: 'estimatedArrival',
      width: 120,
      search: false,
      render: (_, record) => {
        const eta = dayjs(record.estimatedArrival);
        return eta.isAfter(dayjs()) ? eta.fromNow() : eta.format('DD MMM YYYY');
      },
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 100,
      render: (_, record) => {
        const isIncomingPending =
          record.direction === 'incoming' && PENDING_STATUSES.includes(record.status);
        if (isIncomingPending) {
          return (
            <Space size={4}>
              <Button
                type="link"
                size="small"
                icon={<Check size={14} />}
                style={{ color: '#52c41a', padding: '0 4px' }}
                onClick={() => message.info(`Accept ${record.trackingId} — TODO`)}
              >
                Accept
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<XCircle size={14} />}
                style={{ padding: '0 4px' }}
                onClick={() => message.info(`Reject ${record.trackingId} — TODO`)}
              >
                Reject
              </Button>
            </Space>
          );
        }
        return (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<Eye size={14} />}
              style={{ padding: '0 4px' }}
              onClick={() => message.info(`View ${record.trackingId} — TODO`)}
            >
              View
            </Button>
            {record.status === 'draft' || record.status === 'initiated' ? (
              <Button
                type="link"
                size="small"
                danger
                icon={<X size={14} />}
                style={{ padding: '0 4px' }}
                onClick={() => message.info(`Cancel ${record.trackingId} — TODO`)}
              >
                Cancel
              </Button>
            ) : null}
          </Space>
        );
      },
    },
  ];

  // ---------------------------------------------------------------------------
  // Manifest table columns (wizard step 2)
  // ---------------------------------------------------------------------------

  const manifestColumns = [
    {
      title: 'Tracking ID',
      dataIndex: 'trackingId',
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>
      ),
    },
    { title: 'Strain', dataIndex: 'strain' },
    { title: 'Weight (g)', dataIndex: 'weightGrams', render: (v: number) => `${v}g` },
    { title: 'Stage', dataIndex: 'stage' },
  ];

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  const tabItems: TabsProps['items'] = [
    { key: 'all', label: `All Transfers (${total})` },
    { key: 'outgoing', label: `Outgoing (${outCount})` },
    { key: 'incoming', label: `Incoming (${inCount})` },
    { key: 'pending', label: `Pending Action (${pendingCount})` },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <NctsPageContainer
      title="Transfers"
      subTitle={`${total} transfers total`}
      extra={
        <Space>
          <CsvExportButton
            data={MOCK_TRANSFERS}
            columns={CSV_COLUMNS}
            filename={`transfers-${dayjs().format('YYYY-MM-DD')}`}
            label="Export CSV"
          />
          <Button
            type="primary"
            icon={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Plus size={16} />
                <Truck size={16} />
              </span>
            }
            onClick={openWizard}
          >
            Create Transfer
          </Button>
        </Space>
      }
    >
      {/* ── Tab bar ── */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 0 }}
      />

      {/* ── ProTable ── */}
      <ProTable<Transfer>
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        search={{ filterType: 'light' }}
        options={{ density: true, fullScreen: true, reload: () => message.info('Reload — TODO') }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        dateFormatter="string"
        headerTitle={false}
        toolBarRender={false}
        style={{ marginTop: -1 }}
      />

      {/* ── Create Transfer Wizard Modal ── */}
      <Modal
        title="Create Transfer"
        open={wizardOpen}
        onCancel={closeWizard}
        footer={null}
        width={720}
        destroyOnClose
      >
        <StepsForm
          onFinish={async (values) => {
            const payload = {
              ...wizardFormData,
              ...values,
              manifest: selectedPlants.map((p) => p.trackingId),
              securityMeasures,
            };
            // TODO: Replace with real API call
            await new Promise((r) => setTimeout(r, 600));
            console.log('Transfer payload:', payload);
            message.success('Transfer initiated successfully!');
            closeWizard();
          }}
          stepsProps={{ style: { marginBottom: 24 } }}
          formProps={{ layout: 'vertical' }}
        >
          {/* ── Step 1: Destination ── */}
          <StepsForm.StepForm
            name="destination"
            title="Destination"
            onFinish={async (values) => {
              setWizardFormData((prev) => ({ ...prev, ...values }));
              return true;
            }}
          >
            <ProFormSelect
              name="destinationFacility"
              label="Destination Facility"
              rules={[{ required: true, message: 'Select a destination facility' }]}
              options={MOCK_FACILITIES}
              placeholder="Select destination facility"
              showSearch
            />
            <ProFormDatePicker
              name="estimatedArrival"
              label="Estimated Arrival"
              rules={[{ required: true, message: 'Select an estimated arrival date' }]}
              fieldProps={{
                disabledDate: (current: dayjs.Dayjs) => current && current.isBefore(dayjs(), 'day'),
                style: { width: '100%' },
              }}
            />
          </StepsForm.StepForm>

          {/* ── Step 2: Manifest ── */}
          <StepsForm.StepForm
            name="manifest"
            title="Manifest"
            onFinish={async () => {
              if (selectedPlantKeys.length === 0) {
                message.warning('Select at least one plant for the manifest.');
                return false;
              }
              setWizardFormData((prev) => ({ ...prev, selectedPlantIds: selectedPlantKeys }));
              return true;
            }}
          >
            <div style={{ marginBottom: 12, fontWeight: 600 }}>
              Select plants from source facility:
            </div>
            <Table
              columns={manifestColumns}
              dataSource={MOCK_SOURCE_PLANTS}
              rowKey="id"
              size="small"
              pagination={false}
              rowSelection={{
                selectedRowKeys: selectedPlantKeys,
                onChange: (keys) => setSelectedPlantKeys(keys),
              }}
              style={{ marginBottom: 16 }}
            />
            <div
              style={{
                padding: '8px 12px',
                background: '#f0f5ff',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Selected: {selectedPlantKeys.length} plant{selectedPlantKeys.length !== 1 ? 's' : ''}
              {selectedPlants.length > 0 && (
                <span style={{ marginLeft: 12, color: '#666' }}>
                  Total weight: {selectedPlants.reduce((s, p) => s + p.weightGrams, 0)}g
                </span>
              )}
            </div>
          </StepsForm.StepForm>

          {/* ── Step 3: Transport Details ── */}
          <StepsForm.StepForm
            name="transport"
            title="Transport Details"
            onFinish={async (values) => {
              setWizardFormData((prev) => ({ ...prev, ...values, securityMeasures }));
              return true;
            }}
          >
            <ProFormText
              name="vehicleRegistration"
              label="Vehicle Registration"
              rules={[{ required: true, message: 'Enter vehicle registration' }]}
              placeholder="e.g. CA 123-456"
            />
            <ProFormText
              name="driverName"
              label="Driver Name"
              rules={[{ required: true, message: 'Enter driver name' }]}
              placeholder="Full name"
            />
            <ProFormText
              name="driverIdNumber"
              label="Driver ID Number"
              rules={[{ required: true, message: 'Enter driver ID number' }]}
              placeholder="SA ID number"
            />
            <ProFormTextArea
              name="plannedRoute"
              label="Planned Route"
              placeholder="Describe the planned route (optional)"
              fieldProps={{ rows: 3 }}
            />
            <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
              Security Measures
            </div>
            <Checkbox.Group
              options={SECURITY_OPTIONS}
              value={securityMeasures}
              onChange={(vals) => setSecurityMeasures(vals as string[])}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            />
          </StepsForm.StepForm>

          {/* ── Step 4: Review & Initiate ── */}
          <StepsForm.StepForm
            name="review"
            title="Review & Initiate"
            onFinish={async () => {
              if (!authorized) {
                message.warning('You must authorize this transfer to proceed.');
                return false;
              }
              return true;
            }}
          >
            <Descriptions
              bordered
              column={1}
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="Destination">
                {MOCK_FACILITIES.find((f) => f.value === wizardFormData.destinationFacility)?.label ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Estimated Arrival">
                {wizardFormData.estimatedArrival
                  ? dayjs(wizardFormData.estimatedArrival).format('DD MMM YYYY')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Manifest">
                {selectedPlants.length} plant{selectedPlants.length !== 1 ? 's' : ''} —{' '}
                {selectedPlants.reduce((s, p) => s + p.weightGrams, 0)}g total
              </Descriptions.Item>
              <Descriptions.Item label="Vehicle">
                {wizardFormData.vehicleRegistration ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Driver">
                {wizardFormData.driverName ?? '—'} ({wizardFormData.driverIdNumber ?? '—'})
              </Descriptions.Item>
              <Descriptions.Item label="Route">
                {wizardFormData.plannedRoute || 'Not specified'}
              </Descriptions.Item>
              <Descriptions.Item label="Security">
                {securityMeasures.length > 0
                  ? securityMeasures
                      .map((v) => SECURITY_OPTIONS.find((o) => o.value === v)?.label ?? v)
                      .join(', ')
                  : 'None'}
              </Descriptions.Item>
            </Descriptions>

            {/* QR code for shipment tracking */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 16px' }}>
              <QRCode
                value={`TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-DRAFT`}
                size={120}
              />
            </div>

            <Checkbox
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              style={{ fontWeight: 500 }}
            >
              I authorize this transfer
            </Checkbox>
          </StepsForm.StepForm>
        </StepsForm>
      </Modal>
    </NctsPageContainer>
  );
}
