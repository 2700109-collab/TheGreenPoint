/**
 * HarvestsPage — Harvest management with ProTable, StepsForm modal, and CSV export.
 * Per FrontEnd.md §3.6.
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { Button, Dropdown, Table, Space, Tag, Descriptions, Checkbox, Select, Modal, message, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  ProTable, StepsForm, ProFormSelect, ProFormDatePicker, ProFormDigit, ProFormTextArea,
} from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Plus, Wheat, Eye, Pencil, FlaskConical, MoreVertical } from 'lucide-react';
import { StatusBadge, TrackingId, NctsPageContainer, CsvExportButton } from '@ncts/ui';
import { useHarvests, useCreateHarvest, usePlants } from '@ncts/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Harvest {
  id: string; trackingId: string; plantCount: number;
  facilityId: string; facilityName: string; harvestDate: string;
  wetWeight: number; dryWeight: number | null;
  harvestMethod: 'manual' | 'machine'; dryingMethod: string | null;
  storageLocation: string | null; status: string; labStatus: string | null;
  notes: string; plantIds: string[];
}

interface FloweringPlant {
  id: string; trackingId: string; strain: string;
  facilityId: string; facilityName: string; plantedDate: string;
}



// ---------------------------------------------------------------------------
// CSV columns
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { key: 'trackingId', header: 'Harvest ID' },
  { key: 'plantCount', header: 'Plants' },
  { key: 'facilityName', header: 'Facility' },
  { key: 'harvestDate', header: 'Harvest Date' },
  { key: 'wetWeight', header: 'Wet Weight (g)' },
  { key: 'dryWeight', header: 'Dry Weight (g)', formatter: (v: number | null) => (v != null ? String(v) : '') },
  { key: 'status', header: 'Status' },
  { key: 'labStatus', header: 'Lab Status', formatter: (v: string | null) => v ?? '' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DRYING_LABELS: Record<string, string> = { hang_dry: 'Hang Dry', rack_dry: 'Rack Dry', machine: 'Machine' };

function computeYield(wet: number, dry: number | null): { value: number | null; color: string } {
  if (dry == null || wet === 0) return { value: null, color: '' };
  const pct = (dry / wet) * 100;
  const color = pct >= 12 ? '#52c41a' : pct >= 8 ? '#faad14' : '#f5222d';
  return { value: pct, color };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HarvestsPage() {
  const actionRef = useRef<ActionType>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);
  const [facilityFilter, setFacilityFilter] = useState<string | undefined>();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [confirmed, setConfirmed] = useState(false);

  const { data: harvestsResponse, isLoading, refetch } = useHarvests();
  const harvests: Harvest[] = ((harvestsResponse as any)?.data ?? harvestsResponse ?? []) as Harvest[];

  const { data: floweringPlantsResponse } = usePlants({ state: 'flowering' } as any);
  const floweringPlants: FloweringPlant[] = useMemo(() => {
    const raw: any[] = (floweringPlantsResponse as any)?.data ?? floweringPlantsResponse ?? [];
    return raw.map((p: any) => ({
      id: p.id,
      trackingId: p.trackingId,
      strain: p.strain,
      facilityId: p.facilityId,
      facilityName: p.facilityName ?? p.facility?.name ?? '',
      plantedDate: p.plantedDate,
    }));
  }, [floweringPlantsResponse]);

  const createHarvest = useCreateHarvest();

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  const filteredPlants = useMemo(
    () => facilityFilter ? floweringPlants.filter((p) => p.facilityId === facilityFilter) : floweringPlants,
    [facilityFilter, floweringPlants],
  );

  const facilityOptions = useMemo(() => {
    const seen = new Map<string, string>();
    floweringPlants.forEach((p) => seen.set(p.facilityId, p.facilityName));
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [floweringPlants]);

  const resetModal = useCallback(() => {
    setSelectedPlantIds([]);
    setFacilityFilter(undefined);
    setFormValues({});
    setConfirmed(false);
  }, []);

  const handleOpenModal = useCallback(() => {
    resetModal();
    setModalOpen(true);
  }, [resetModal]);

  const handleSubmit = useCallback(async () => {
    try {
      await createHarvest.mutateAsync({
        plantIds: selectedPlantIds,
        ...formValues,
      } as any);
      message.success('Harvest recorded successfully');
      setModalOpen(false);
      resetModal();
      refetch();
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to record harvest');
    }
  }, [resetModal, selectedPlantIds, formValues, createHarvest, refetch]);

  const getRowMenuItems = useCallback((record: Harvest): MenuProps['items'] => [
    { key: 'view', icon: <Eye size={14} />, label: 'View' },
    { key: 'edit', icon: <Pencil size={14} />, label: 'Edit' },
    { key: 'lab', icon: <FlaskConical size={14} />, label: 'Submit for Lab', disabled: record.labStatus != null },
  ], []);

  const selectedPlantsData = useMemo(
    () => floweringPlants.filter((p) => selectedPlantIds.includes(p.id)),
    [selectedPlantIds, floweringPlants],
  );

  const reviewYield = useMemo(
    () => computeYield(formValues.wetWeight ?? 0, formValues.dryWeight ?? null),
    [formValues.wetWeight, formValues.dryWeight],
  );

  // -- ProTable columns -------------------------------------------------------

  const columns: ProColumns<Harvest>[] = useMemo(() => [
    {
      title: 'Harvest ID',
      dataIndex: 'trackingId',
      width: 180,
      render: (_, r) => (
        <TrackingId id={r.trackingId} size="sm" linkTo={`/harvests/${r.id}`} copyable />
      ),
    },
    {
      title: 'Plants',
      dataIndex: 'plantCount',
      width: 80,
      sorter: (a, b) => a.plantCount - b.plantCount,
      render: (_, r) => (
        <Tag style={{ borderRadius: 10, minWidth: 28, textAlign: 'center' }}>{r.plantCount}</Tag>
      ),
    },
    {
      title: 'Facility',
      dataIndex: 'facilityName',
      width: 180,
      filters: [
        { text: 'Cape Town Facility', value: 'Cape Town Facility' },
        { text: 'Johannesburg Grow House', value: 'Johannesburg Grow House' },
        { text: 'Durban Indoor Farm', value: 'Durban Indoor Farm' },
      ],
      onFilter: (v, r) => r.facilityName === v,
      render: (_, r) => <a style={{ color: '#1677ff' }}>{r.facilityName}</a>,
    },
    {
      title: 'Harvest Date',
      dataIndex: 'harvestDate',
      width: 130,
      sorter: (a, b) => dayjs(a.harvestDate).unix() - dayjs(b.harvestDate).unix(),
      render: (_, r) => dayjs(r.harvestDate).format('DD MMM YYYY'),
    },
    {
      title: 'Wet Weight (g)',
      dataIndex: 'wetWeight',
      width: 120,
      sorter: (a, b) => a.wetWeight - b.wetWeight,
      render: (_, r) => <span>{r.wetWeight.toLocaleString()} g</span>,
    },
    {
      title: 'Dry Weight (g)',
      dataIndex: 'dryWeight',
      width: 120,
      sorter: (a, b) => (a.dryWeight ?? 0) - (b.dryWeight ?? 0),
      render: (_, r) =>
        r.dryWeight != null ? <span>{r.dryWeight.toLocaleString()} g</span> : '—',
    },
    {
      title: 'Yield %',
      key: 'yield',
      width: 80,
      sorter: (a, b) => {
        const ya = a.dryWeight && a.wetWeight ? (a.dryWeight / a.wetWeight) * 100 : 0;
        const yb = b.dryWeight && b.wetWeight ? (b.dryWeight / b.wetWeight) * 100 : 0;
        return ya - yb;
      },
      render: (_, r) => {
        const { value, color } = computeYield(r.wetWeight, r.dryWeight);
        if (value == null) return '—';
        return <span style={{ color, fontWeight: 600 }}>{value.toFixed(1)}%</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      filters: [
        { text: 'Completed', value: 'completed' },
        { text: 'Drying', value: 'drying' },
        { text: 'Processing', value: 'processing' },
      ],
      onFilter: (v, r) => r.status === v,
      render: (_, r) => <StatusBadge status={r.status as any} />,
    },
    {
      title: 'Lab Test',
      dataIndex: 'labStatus',
      width: 120,
      render: (_, r) =>
        r.labStatus ? <StatusBadge status={r.labStatus as any} /> : '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (_, r) => (
        <Dropdown menu={{ items: getRowMenuItems(r) }} trigger={['click']}>
          <Button
            type="text"
            size="small"
            icon={<MoreVertical size={16} />}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </Dropdown>
      ),
    },
  ], [getRowMenuItems]);

  // -- Plant selection columns (Step 1) ----------------------------------------

  const plantCols = useMemo(() => [
    { title: 'Plant ID', dataIndex: 'trackingId', render: (t: string) => <TrackingId id={t} size="sm" copyable={false} /> },
    { title: 'Strain', dataIndex: 'strain' },
    { title: 'Facility', dataIndex: 'facilityName' },
    { title: 'Planted', dataIndex: 'plantedDate', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
  ], []);

  // -- Render ------------------------------------------------------------------

  return (
    <NctsPageContainer
      title="Harvests"
      subTitle={`${harvests.length} total harvests`}
      extra={
        <Space>
          <CsvExportButton data={harvests} columns={CSV_COLUMNS} filename="harvests-export" />
          <Button type="primary" onClick={handleOpenModal} icon={<Plus size={16} />}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Wheat size={16} /> Record Harvest
            </span>
          </Button>
        </Space>
      }
    >
      <ProTable<Harvest>
        columns={columns}
        actionRef={actionRef}
        dataSource={harvests}
        rowKey="id"
        search={{ filterType: 'light' }}
        pagination={{ pageSize: 20, showTotal: (total) => `${total} harvests` }}
        options={{ density: true, fullScreen: true, reload: true, setting: true }}
        dateFormatter="string"
        toolBarRender={false}
      />

      {/* Record Harvest — StepsForm in Modal */}
      <Modal
        title="Record Harvest"
        open={modalOpen}
        onCancel={() => { resetModal(); setModalOpen(false); }}
        footer={null}
        width={680}
        destroyOnClose
      >
        <StepsForm
          onFinish={handleSubmit}
          stepsFormRender={(dom, submitter) => (
            <div>
              {dom}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0', gap: 8 }}>{submitter}</div>
            </div>
          )}
        >
        {/* Step 1 — Select Plants */}
        <StepsForm.StepForm
          name="selectPlants"
          title="Select Plants"
          onFinish={async () => {
            if (selectedPlantIds.length === 0) { message.warning('Please select at least one plant'); return false; }
            return true;
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <Select placeholder="Filter by facility" allowClear style={{ width: 260 }}
              value={facilityFilter} onChange={setFacilityFilter} options={facilityOptions} />
            <span style={{ marginLeft: 12, color: '#8c8c8c', fontSize: 13 }}>
              {selectedPlantIds.length} plant{selectedPlantIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <Table<FloweringPlant>
            columns={plantCols} dataSource={filteredPlants} rowKey="id" size="small" pagination={false}
            rowSelection={{ selectedRowKeys: selectedPlantIds, onChange: (keys) => setSelectedPlantIds(keys as string[]) }}
          />
        </StepsForm.StepForm>

        {/* Step 2 — Harvest Details */}
        <StepsForm.StepForm name="harvestDetails" title="Harvest Details"
          onFinish={async (values) => { setFormValues(values); return true; }}>
          <ProFormDatePicker name="harvestDate" label="Harvest Date"
            rules={[{ required: true, message: 'Harvest date is required' }]}
            fieldProps={{ disabledDate: (c: dayjs.Dayjs) => c && c.isAfter(dayjs(), 'day'), style: { width: '100%' } }} />
          <ProFormSelect name="harvestMethod" label="Harvest Method"
            rules={[{ required: true, message: 'Harvest method is required' }]}
            options={[{ value: 'manual', label: 'Manual' }, { value: 'machine', label: 'Machine' }]} />
          <ProFormDigit name="wetWeight" label="Wet Weight (g)"
            rules={[{ required: true, message: 'Wet weight is required' }, { type: 'number', min: 0.1, message: 'Must be > 0' }]}
            fieldProps={{ precision: 1, style: { width: '100%' } }} />
          <ProFormDigit name="dryWeight" label="Dry Weight (g)"
            fieldProps={{ precision: 1, style: { width: '100%' } }}
            rules={[{ validator: async (_: unknown, v: number) => { if (v != null && formValues.wetWeight != null && v > formValues.wetWeight) throw new Error('Cannot exceed wet weight'); } }]} />
          <ProFormSelect name="dryingMethod" label="Drying Method"
            options={[{ value: 'hang_dry', label: 'Hang Dry' }, { value: 'rack_dry', label: 'Rack Dry' }, { value: 'machine', label: 'Machine' }]} />
          <ProFormTextArea name="storageLocation" label="Storage Location" fieldProps={{ rows: 1, maxLength: 100 }} />
          <ProFormTextArea name="notes" label="Notes" fieldProps={{ rows: 3, maxLength: 500, showCount: true }} />
        </StepsForm.StepForm>

        {/* Step 3 — Review */}
        <StepsForm.StepForm name="review" title="Review">
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}
            labelStyle={{ fontWeight: 600, width: 160 }}>
            <Descriptions.Item label="Plants">{selectedPlantsData.length}</Descriptions.Item>
            <Descriptions.Item label="Harvest Date">
              {formValues.harvestDate ? dayjs(formValues.harvestDate).format('DD MMM YYYY') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Harvest Method">
              {formValues.harvestMethod === 'manual' ? 'Manual' : 'Machine'}
            </Descriptions.Item>
            <Descriptions.Item label="Wet Weight">
              {formValues.wetWeight != null ? `${Number(formValues.wetWeight).toLocaleString()} g` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Dry Weight">
              {formValues.dryWeight != null ? `${Number(formValues.dryWeight).toLocaleString()} g` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Yield %">
              {reviewYield.value != null
                ? <span style={{ color: reviewYield.color, fontWeight: 600 }}>{reviewYield.value.toFixed(1)}%</span>
                : '—'}
            </Descriptions.Item>
            {formValues.dryingMethod && (
              <Descriptions.Item label="Drying Method">{DRYING_LABELS[formValues.dryingMethod] ?? formValues.dryingMethod}</Descriptions.Item>
            )}
            {formValues.notes && (
              <Descriptions.Item label="Notes" span={2}>{formValues.notes}</Descriptions.Item>
            )}
          </Descriptions>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Selected Plants</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedPlantsData.map((p) => <Tag key={p.id}>{p.trackingId} — {p.strain}</Tag>)}
            </div>
          </div>

          <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: 8 }}>
            I confirm the harvest details above are accurate and ready for submission.
          </Checkbox>
        </StepsForm.StepForm>
      </StepsForm>
      </Modal>
    </NctsPageContainer>
  );
}
