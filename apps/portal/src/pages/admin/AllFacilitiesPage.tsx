/**
 * AllFacilitiesPage — All facilities across all tenants (admin view).
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag, Spin, Typography, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Eye, MoreVertical, MapPin, ClipboardCheck } from 'lucide-react';
import { NctsPageContainer, StatusBadge, CsvExportButton, DataFreshness } from '@ncts/ui';
import { useFacilities } from '@ncts/api-client';

const { Text } = Typography;

interface Facility {
  id: string;
  name: string;
  facilityType: string;
  province?: string;
  address?: string;
  isActive?: boolean;
  tenant?: { name: string; tradingName?: string };
  createdAt?: string;
}

const CSV_COLS = [
  { key: 'name', header: 'Facility' },
  { key: 'operatorName', header: 'Operator' },
  { key: 'facilityType', header: 'Type' },
  { key: 'province', header: 'Province' },
  { key: 'status', header: 'Status' },
];

const TYPE_COLOR: Record<string, string> = { cultivation: 'green', processing: 'blue', distribution: 'purple', retail: 'orange', storage: 'cyan' };

export default function AllFacilitiesPage() {
  const navigate = useNavigate();
  const { data: facData, isLoading, refetch } = useFacilities();
  const facilities: Facility[] = useMemo(() => {
    const raw = facData?.data ?? facData ?? [];
    return (Array.isArray(raw) ? raw : []).map((f: any) => ({ ...f, operatorName: f.tenant?.tradingName ?? f.tenant?.name ?? '—', status: f.isActive ? 'Active' : 'Inactive' }));
  }, [facData]);

  const columns: ProColumns<Facility>[] = [
    { title: 'Facility', dataIndex: 'name', render: (_, r) => <Text strong>{r.name}</Text> },
    { title: 'Operator', key: 'operator', render: (_, r) => r.tenant?.tradingName ?? r.tenant?.name ?? '—' },
    { title: 'Type', dataIndex: 'facilityType', render: (_, r) => <Tag color={TYPE_COLOR[r.facilityType] ?? 'default'}>{r.facilityType}</Tag> },
    { title: 'Province', dataIndex: 'province' },
    { title: 'Status', key: 'active', render: (_, r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} /> },
    { title: '', key: 'actions', width: 48, render: () => {
      const items: MenuProps['items'] = [
        { key: 'view', icon: <Eye size={14} />, label: 'View details' },
        { key: 'map', icon: <MapPin size={14} />, label: 'View on map' },
        { key: 'inspect', icon: <ClipboardCheck size={14} />, label: 'Schedule inspection' },
      ];
      return <Dropdown menu={{ items, onClick: ({ key }) => { if (key === 'map') navigate('/admin/facilities/map'); else navigate(`/admin/facilities`); } }} trigger={['click']}><Button type="text" icon={<MoreVertical size={16} />} /></Dropdown>;
    }},
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="All Facilities" subTitle={`${facilities.length} facilities registered`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
        <span style={{ display: 'flex', gap: 8 }}>
          <CsvExportButton data={facilities} columns={CSV_COLS} filename="all-facilities" />
          <Button icon={<MapPin size={16} />} onClick={() => navigate('/admin/facilities/map')}>Map View</Button>
        </span>
      </div>
      <ProTable<Facility> columns={columns} dataSource={facilities} rowKey="id" search={false} toolBarRender={false} pagination={{ pageSize: 20, showSizeChanger: true }} />
    </NctsPageContainer>
  );
}
