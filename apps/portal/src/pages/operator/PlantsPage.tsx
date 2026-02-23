/**
 * PlantsPage — Plant Management page with ProTable, tabs, bulk import, and row expansion.
 *
 * Per FrontEnd.md §3.3.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tabs, Dropdown, Modal, Upload, Table, Space, Descriptions, Typography, Spin } from 'antd';
import type { MenuProps, TabsProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Plus, Upload as UploadIcon, Eye, Pencil, Wheat, Trash2, MoreVertical, Download } from 'lucide-react';
import {
  StatusBadge,
  TrackingId,
  PlantLifecycle,
  NctsPageContainer,
  CsvExportButton,
} from '@ncts/ui';
import type { PlantStage, LifecycleStageInfo } from '@ncts/ui';
import { usePlants } from '@ncts/api-client';

dayjs.extend(relativeTime);

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Plant {
  id: string;
  trackingId: string;
  strain: string;
  currentStage: PlantStage;
  facilityId: string;
  facilityName: string;
  plantedDate: string;
  stageStartDate: string;
  updatedAt: string;
  batchId: string;
  motherPlantId: string | null;
  notes: string;
  stages: LifecycleStageInfo[];
}

const ACTIVE_STAGES: PlantStage[] = ['seedling', 'vegetative', 'flowering'];

// ---------------------------------------------------------------------------
// CSV export column config
// ---------------------------------------------------------------------------

const PLANT_CSV_COLUMNS = [
  { key: 'trackingId', header: 'Tracking ID' },
  { key: 'strain', header: 'Strain' },
  { key: 'currentStage', header: 'Stage' },
  { key: 'facilityName', header: 'Facility' },
  { key: 'plantedDate', header: 'Planted Date' },
  { key: 'updatedAt', header: 'Last Activity' },
  { key: 'notes', header: 'Notes' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeStageDays(stageStartDate: string): number {
  return dayjs().diff(dayjs(stageStartDate), 'day');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlantsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [importFileList, setImportFileList] = useState<any[]>([]);

  const { data: plantsResponse, isLoading } = usePlants();
  const allPlants: Plant[] = ((plantsResponse as any)?.data ?? plantsResponse ?? []) as Plant[];

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  // Derived counts
  const totalCount = allPlants.length;
  const activeCount = allPlants.filter((p) => ACTIVE_STAGES.includes(p.currentStage)).length;
  const harvestedCount = allPlants.filter((p) => p.currentStage === 'harvested').length;
  const destroyedCount = allPlants.filter((p) => p.currentStage === 'destroyed').length;

  // Filtered data by tab
  const filteredPlants = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return allPlants.filter((p) => ACTIVE_STAGES.includes(p.currentStage));
      case 'harvested':
        return allPlants.filter((p) => p.currentStage === 'harvested');
      case 'destroyed':
        return allPlants.filter((p) => p.currentStage === 'destroyed');
      default:
        return allPlants;
    }
  }, [activeTab, allPlants]);

  // ---------------------------------------------------------------------------
  // Actions dropdown menu builder
  // ---------------------------------------------------------------------------

  const getActionMenuItems = useCallback(
    (record: Plant): MenuProps['items'] => [
      {
        key: 'view',
        icon: <Eye size={14} />,
        label: 'View',
        onClick: () => navigate(`/operator/plants/${record.id}`),
      },
      {
        key: 'edit',
        icon: <Pencil size={14} />,
        label: 'Edit',
        onClick: () => navigate(`/operator/plants/${record.id}`),
      },
      { type: 'divider' },
      {
        key: 'harvest',
        icon: <Wheat size={14} />,
        label: 'Record Harvest',
        disabled: record.currentStage === 'harvested' || record.currentStage === 'destroyed',
        onClick: () => {
          // TODO: Open harvest recording modal / navigate to harvest form
          console.log('Record harvest for', record.trackingId);
        },
      },
      {
        key: 'destroy',
        icon: <Trash2 size={14} />,
        label: 'Destroy',
        danger: true,
        disabled: record.currentStage === 'destroyed',
        onClick: () => {
          // TODO: Open destroy confirmation modal
          console.log('Destroy', record.trackingId);
        },
      },
    ],
    [navigate],
  );

  // ---------------------------------------------------------------------------
  // ProTable columns
  // ---------------------------------------------------------------------------

  const columns: ProColumns<Plant>[] = [
    {
      title: 'Tracking ID',
      dataIndex: 'trackingId',
      width: 200,
      sorter: (a, b) => a.trackingId.localeCompare(b.trackingId),
      render: (_, record) => (
        <TrackingId id={record.trackingId} size="sm" linkTo={`/operator/plants/${record.id}`} />
      ),
    },
    {
      title: 'Strain',
      dataIndex: 'strain',
      width: 150,
      sorter: (a, b) => a.strain.localeCompare(b.strain),
      ellipsis: true,
    },
    {
      title: 'Stage',
      dataIndex: 'currentStage',
      width: 130,
      sorter: (a, b) => a.currentStage.localeCompare(b.currentStage),
      render: (_, record) => (
        <StatusBadge status={record.currentStage as any} variant="dot" />
      ),
      valueEnum: {
        seedling: { text: 'Seedling' },
        vegetative: { text: 'Vegetative' },
        flowering: { text: 'Flowering' },
        harvested: { text: 'Harvested' },
        destroyed: { text: 'Destroyed' },
      },
    },
    {
      title: 'Facility',
      dataIndex: 'facilityName',
      width: 180,
      sorter: (a, b) => a.facilityName.localeCompare(b.facilityName),
      render: (_, record) => (
        <a
          onClick={() => navigate(`/operator/facilities`)}
          style={{ cursor: 'pointer' }}
        >
          {record.facilityName}
        </a>
      ),
    },
    {
      title: 'Planted Date',
      dataIndex: 'plantedDate',
      width: 130,
      sorter: (a, b) => dayjs(a.plantedDate).unix() - dayjs(b.plantedDate).unix(),
      render: (_, record) => dayjs(record.plantedDate).format('DD MMM YYYY'),
      valueType: 'date',
    },
    {
      title: 'Days in Stage',
      dataIndex: 'stageDays',
      width: 100,
      search: false,
      sorter: (a, b) => computeStageDays(a.stageStartDate) - computeStageDays(b.stageStartDate),
      render: (_, record) => {
        const days = computeStageDays(record.stageStartDate);
        return (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {days}d
          </span>
        );
      },
    },
    {
      title: 'Last Activity',
      dataIndex: 'updatedAt',
      width: 130,
      search: false,
      sorter: (a, b) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix(),
      render: (_, record) => (
        <span title={dayjs(record.updatedAt).format('DD MMM YYYY HH:mm')}>
          {dayjs(record.updatedAt).fromNow()}
        </span>
      ),
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreVertical size={16} />} />
        </Dropdown>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Expandable row renderer
  // ---------------------------------------------------------------------------

  const expandedRowRender = (record: Plant) => (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PlantLifecycle
        currentStage={record.currentStage}
        stages={record.stages}
        direction="horizontal"
        size="sm"
        showDates
      />
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2, md: 4 }}
        style={{ maxWidth: 800 }}
      >
        <Descriptions.Item label="Strain">{record.strain}</Descriptions.Item>
        <Descriptions.Item label="Batch">{record.batchId}</Descriptions.Item>
        <Descriptions.Item label="Mother Plant">
          {record.motherPlantId ? (
            <TrackingId id={record.motherPlantId} size="sm" linkTo={`/operator/plants/${record.motherPlantId}`} />
          ) : (
            <Text type="secondary">—</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Notes">
          {record.notes || <Text type="secondary">No notes</Text>}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Tab items
  // ---------------------------------------------------------------------------

  const tabItems: TabsProps['items'] = [
    { key: 'all', label: `All (${totalCount})` },
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'harvested', label: `Harvested (${harvestedCount})` },
    { key: 'destroyed', label: `Destroyed (${destroyedCount})` },
  ];

  // ---------------------------------------------------------------------------
  // Bulk import modal — simplified per spec
  // ---------------------------------------------------------------------------

  const bulkImportPreviewColumns = [
    { title: 'Tracking ID', dataIndex: 'trackingId', key: 'trackingId' },
    { title: 'Strain', dataIndex: 'strain', key: 'strain' },
    { title: 'Facility', dataIndex: 'facilityName', key: 'facilityName' },
    { title: 'Planted Date', dataIndex: 'plantedDate', key: 'plantedDate' },
  ];

  // TODO: Parse CSV file and populate preview rows
  const bulkImportPreviewData: Record<string, string>[] = [];

  const handleBulkImportConfirm = () => {
    // TODO: Call bulk import API
    console.log('Bulk import confirmed with files:', importFileList);
    setBulkImportOpen(false);
    setImportFileList([]);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <NctsPageContainer
      title="Plant Management"
      subTitle={`${totalCount} plants registered`}
      extra={
        <Space>
          <CsvExportButton
            data={filteredPlants}
            filename="plants-export"
            columns={PLANT_CSV_COLUMNS}
          />
          <Button
            icon={<UploadIcon size={16} />}
            onClick={() => setBulkImportOpen(true)}
          >
            Bulk Import
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate('/operator/plants/register')}
          >
            Register Plant
          </Button>
        </Space>
      }
    >
      {/* Filter Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 0 }}
      />

      {/* ProTable */}
      <ProTable<Plant>
        columns={columns}
        dataSource={filteredPlants}
        request={async (_params, _sort, _filter) => {
          // TODO: Replace with real API call
          // e.g. const res = await fetchPlants({ ...params, ...sort, ...filter, tab: activeTab });
          // return { data: res.items, total: res.total, success: true };
          return {
            data: filteredPlants,
            total: filteredPlants.length,
            success: true,
          };
        }}
        rowKey="id"
        search={{
          filterType: 'light',
          defaultCollapsed: true,
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} plants`,
        }}
        options={{
          density: true,
          fullScreen: true,
          reload: true,
          setting: true,
        }}
        dateFormatter="string"
        headerTitle="Plants"
        expandable={{
          expandedRowRender,
          rowExpandable: () => true,
        }}
        scroll={{ x: 1120 }}
        // TODO: Mobile view (<768px) — switch to card list layout
      />

      {/* Bulk Import Modal */}
      <Modal
        title="Bulk Import Plants"
        open={bulkImportOpen}
        onCancel={() => {
          setBulkImportOpen(false);
          setImportFileList([]);
        }}
        footer={[
          <Button key="template" icon={<Download size={14} />} style={{ float: 'left' }}>
            {/* TODO: Link to actual CSV template download */}
            Download Template
          </Button>,
          <Button key="cancel" onClick={() => setBulkImportOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            disabled={importFileList.length === 0}
            onClick={handleBulkImportConfirm}
          >
            Confirm Import
          </Button>,
        ]}
        width={680}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Upload.Dragger
            accept=".csv"
            maxCount={1}
            fileList={importFileList}
            beforeUpload={(file) => {
              // TODO: Validate file size (max 5MB) and parse CSV for preview
              const isUnder5MB = file.size / 1024 / 1024 < 5;
              if (!isUnder5MB) {
                console.error('File must be smaller than 5MB');
                return Upload.LIST_IGNORE;
              }
              setImportFileList([file]);
              return false; // prevent auto upload
            }}
            onRemove={() => setImportFileList([])}
          >
            <div style={{ padding: '20px 0' }}>
              <UploadIcon size={32} style={{ color: '#8c8c8c', marginBottom: 8 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>
                Click or drag a CSV file here
              </p>
              <p style={{ margin: 0, color: '#8c8c8c', fontSize: 13 }}>
                .csv files only, max 5MB
              </p>
            </div>
          </Upload.Dragger>

          {/* Preview table — shown after CSV parse */}
          {bulkImportPreviewData.length > 0 && (
            <div>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                Preview (first 5 rows)
              </Text>
              <Table
                columns={bulkImportPreviewColumns}
                dataSource={bulkImportPreviewData.slice(0, 5)}
                pagination={false}
                size="small"
                rowKey={(_, idx) => String(idx)}
              />
            </div>
          )}

          {/* TODO: Show per-row validation errors */}
          {/* TODO: Show progress bar during import */}
        </div>
      </Modal>
    </NctsPageContainer>
  );
}
