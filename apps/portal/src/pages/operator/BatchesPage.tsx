/**
 * BatchesPage — Batch Management for operator portal.
 * Lists all batches for the current tenant with strain, facility, weight, status.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tabs, Tag, Spin, Typography, Dropdown } from 'antd';
import type { TabsProps, MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Eye, MoreVertical, FlaskConical } from 'lucide-react';
import { NctsPageContainer, StatusBadge, TrackingId, CsvExportButton, DataFreshness } from '@ncts/ui';
import { useBatches } from '@ncts/api-client';

const { Text } = Typography;

interface Batch {
  id: string;
  batchNumber: string;
  batchType: string;
  plantCount: number;
  wetWeightGrams: number | null;
  dryWeightGrams: number | null;
  createdDate: string;
  strain?: { name: string };
  facility?: { name: string };
  labResult?: { status: string } | null;
}

const BATCH_CSV_COLUMNS = [
  { key: 'batchNumber', header: 'Batch Number' },
  { key: 'batchType', header: 'Type' },
  { key: 'strainName', header: 'Strain' },
  { key: 'facilityName', header: 'Facility' },
  { key: 'plantCount', header: 'Plant Count' },
  { key: 'dryWeightGrams', header: 'Dry Weight (g)' },
  { key: 'createdDate', header: 'Created Date' },
];

export default function BatchesPage() {
  const navigate = useNavigate();
  const { data: batchData, isLoading, refetch } = useBatches();
  const batches: Batch[] = useMemo(() => {
    const raw = batchData?.data ?? batchData ?? [];
    return (Array.isArray(raw) ? raw : []).map((b: any) => ({
      ...b,
      strainName: b.strain?.name ?? 'Unknown',
      facilityName: b.facility?.name ?? '—',
    }));
  }, [batchData]);

  const tabCounts = useMemo(() => ({
    all: batches.length,
    harvest: batches.filter(b => b.batchType === 'harvest').length,
    processing: batches.filter(b => b.batchType === 'processing').length,
  }), [batches]);

  const [activeTab, setActiveTab] = useState<string>('all');
  const filtered = useMemo(() => activeTab === 'all' ? batches : batches.filter(b => b.batchType === activeTab), [batches, activeTab]);

  const columns: ProColumns<Batch>[] = [
    { title: 'Batch Number', dataIndex: 'batchNumber', render: (_, r) => <TrackingId id={r.batchNumber} linkTo={`/operator/plants/batches`} /> },
    { title: 'Type', dataIndex: 'batchType', render: (_, r) => <Tag color={r.batchType === 'harvest' ? 'green' : 'blue'}>{r.batchType}</Tag> },
    { title: 'Strain', dataIndex: ['strain', 'name'], render: (_, r) => r.strain?.name ?? '—' },
    { title: 'Facility', dataIndex: ['facility', 'name'], render: (_, r) => r.facility?.name ?? '—' },
    { title: 'Plants', dataIndex: 'plantCount', sorter: (a, b) => a.plantCount - b.plantCount },
    { title: 'Dry Weight (g)', dataIndex: 'dryWeightGrams', render: (_, r) => r.dryWeightGrams != null ? Number(r.dryWeightGrams).toLocaleString() : '—' },
    { title: 'Lab Result', dataIndex: ['labResult', 'status'], render: (_, r) => r.labResult ? <StatusBadge status={r.labResult.status === 'pass' ? 'active' : r.labResult.status === 'fail' ? 'rejected' : 'pending'} /> : <Text type="secondary">Pending</Text> },
    { title: 'Created', dataIndex: 'createdDate', render: (_, r) => r.createdDate ? dayjs(r.createdDate).format('DD MMM YYYY') : '—', sorter: (a, b) => dayjs(a.createdDate).unix() - dayjs(b.createdDate).unix() },
    { title: '', key: 'actions', width: 48, render: () => { const items: MenuProps['items'] = [{ key: 'view', icon: <Eye size={14} />, label: 'View details' }, { key: 'lab', icon: <FlaskConical size={14} />, label: 'Lab results' }]; return <Dropdown menu={{ items, onClick: ({ key }) => { if (key === 'view') navigate(`/operator/plants/batches`); } }} trigger={['click']}><Button type="text" icon={<MoreVertical size={16} />} /></Dropdown>; } },
  ];

  const tabs: TabsProps['items'] = [
    { key: 'all', label: `All (${tabCounts.all})` },
    { key: 'harvest', label: `Harvest (${tabCounts.harvest})` },
    { key: 'processing', label: `Processing (${tabCounts.processing})` },
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Batch Management" subTitle={`${batches.length} batches registered`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
        <CsvExportButton data={filtered} columns={BATCH_CSV_COLUMNS} filename="batches-export" />
      </div>
      <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: 16 }} />
      <ProTable<Batch>
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        search={false}
        toolBarRender={false}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />
    </NctsPageContainer>
  );
}
