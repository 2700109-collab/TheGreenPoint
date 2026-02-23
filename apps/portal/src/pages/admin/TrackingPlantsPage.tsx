/**
 * TrackingPlantsPage — National plant registry (cross-tenant).
 */
import { useMemo, useState } from 'react';
import { Tabs, Tag, Spin } from 'antd';
import type { TabsProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { NctsPageContainer, TrackingId, CsvExportButton, DataFreshness } from '@ncts/ui';
import { usePlants } from '@ncts/api-client';

interface Plant {
  id: string;
  trackingId: string;
  state: string;
  plantedDate?: string;
  strain?: { name: string };
  facility?: { name: string };
  createdAt?: string;
}

const STATE_COLOR: Record<string, string> = { seed: 'default', seedling: 'lime', vegetative: 'green', flowering: 'gold', harvested: 'blue', destroyed: 'red' };

const CSV_COLS = [
  { key: 'trackingId', header: 'Tracking ID' },
  { key: 'state', header: 'State' },
  { key: 'strainName', header: 'Strain' },
  { key: 'facilityName', header: 'Facility' },
  { key: 'plantedDate', header: 'Planted' },
];

export default function TrackingPlantsPage() {
  const { data: plantData, isLoading, refetch } = usePlants();
  const plants: (Plant & { strainName: string; facilityName: string })[] = useMemo(() => {
    const raw = plantData?.data ?? plantData ?? [];
    return (Array.isArray(raw) ? raw : []).map((p: any) => ({ ...p, strainName: p.strain?.name ?? '—', facilityName: p.facility?.name ?? '—' }));
  }, [plantData]);

  const [tab, setTab] = useState('all');
  const filtered = useMemo(() => tab === 'all' ? plants : plants.filter(p => p.state === tab), [plants, tab]);
  const counts = useMemo(() => ({ all: plants.length, seed: plants.filter(p => p.state === 'seed').length, seedling: plants.filter(p => p.state === 'seedling').length, vegetative: plants.filter(p => p.state === 'vegetative').length, flowering: plants.filter(p => p.state === 'flowering').length, harvested: plants.filter(p => p.state === 'harvested').length, destroyed: plants.filter(p => p.state === 'destroyed').length }), [plants]);

  const tabs: TabsProps['items'] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'vegetative', label: `Vegetative (${counts.vegetative})` },
    { key: 'flowering', label: `Flowering (${counts.flowering})` },
    { key: 'harvested', label: `Harvested (${counts.harvested})` },
  ];

  const columns: ProColumns<Plant>[] = [
    { title: 'Tracking ID', dataIndex: 'trackingId', render: (_, r) => <TrackingId id={r.trackingId} /> },
    { title: 'State', dataIndex: 'state', render: (_, r) => <Tag color={STATE_COLOR[r.state] ?? 'default'}>{r.state}</Tag> },
    { title: 'Strain', key: 'strain', render: (_, r) => r.strain?.name ?? '—' },
    { title: 'Facility', key: 'facility', render: (_, r) => r.facility?.name ?? '—' },
    { title: 'Planted', dataIndex: 'plantedDate', render: (_, r) => r.plantedDate ? dayjs(r.plantedDate).format('DD MMM YYYY') : '—' },
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Plant Registry" subTitle={`${plants.length} plants tracked`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
        <CsvExportButton data={filtered} columns={CSV_COLS} filename="plant-registry" />
      </div>
      <Tabs items={tabs} activeKey={tab} onChange={setTab} style={{ marginBottom: 16 }} />
      <ProTable<Plant> columns={columns} dataSource={filtered} rowKey="id" search={false} toolBarRender={false} pagination={{ pageSize: 20, showSizeChanger: true }} />
    </NctsPageContainer>
  );
}
