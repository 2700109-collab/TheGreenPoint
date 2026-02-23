/**
 * ExpiredPermitsPage — Expired permits requiring renewal.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag, Spin, Dropdown, Empty, message } from 'antd';
import type { MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Eye, MoreVertical, RefreshCw, Ban } from 'lucide-react';
import { NctsPageContainer, StatusBadge, TrackingId, DataFreshness } from '@ncts/ui';
import { usePermits } from '@ncts/api-client';

interface Permit {
  id: string;
  permitNumber: string;
  permitType: string;
  status: string;
  expiryDate?: string;
  tenant?: { name: string };
  facility?: { name: string };
}

export default function ExpiredPermitsPage() {
  const navigate = useNavigate();
  const { data: permitData, isLoading, refetch } = usePermits();

  const expired: Permit[] = useMemo(() => {
    const raw = permitData?.data ?? permitData ?? [];
    return (Array.isArray(raw) ? raw : []).filter((p: any) => p.status === 'expired');
  }, [permitData]);

  const columns: ProColumns<Permit>[] = [
    { title: 'Permit #', dataIndex: 'permitNumber', render: (_, r) => <TrackingId id={r.permitNumber} linkTo={`/admin/permits/${r.id}`} /> },
    { title: 'Type', dataIndex: 'permitType', render: (_, r) => <Tag>{r.permitType?.replace(/_/g, ' ')}</Tag> },
    { title: 'Operator', key: 'tenant', render: (_, r) => r.tenant?.name ?? '—' },
    { title: 'Facility', key: 'facility', render: (_, r) => r.facility?.name ?? '—' },
    { title: 'Expired On', dataIndex: 'expiryDate', render: (_, r) => r.expiryDate ? dayjs(r.expiryDate).format('DD MMM YYYY') : '—' },
    { title: 'Status', dataIndex: 'status', render: () => <StatusBadge status="expired" /> },
    { title: '', key: 'actions', width: 48, render: (_, r) => {
      const items: MenuProps['items'] = [
        { key: 'view', icon: <Eye size={14} />, label: 'View details' },
        { key: 'renew', icon: <RefreshCw size={14} />, label: 'Initiate renewal' },
        { key: 'suspend', icon: <Ban size={14} />, label: 'Suspend operator' },
      ];
      return <Dropdown menu={{ items, onClick: ({ key }) => { if (key === 'view') navigate(`/admin/permits/${r.id}`); else message.info(`${key} — coming in Phase 5`); } }} trigger={['click']}><Button type="text" icon={<MoreVertical size={16} />} /></Dropdown>;
    }},
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Expired Permits" subTitle={`${expired.length} expired permits`}>
      <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
      {expired.length === 0 ? (
        <Empty description="No expired permits" style={{ padding: '80px 0' }} />
      ) : (
        <ProTable<Permit> columns={columns} dataSource={expired} rowKey="id" search={false} toolBarRender={false} pagination={{ pageSize: 20 }} />
      )}
    </NctsPageContainer>
  );
}
