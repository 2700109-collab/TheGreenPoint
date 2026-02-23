/**
 * OutgoingTransfersPage — Transfers sent by this operator.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spin, Space, Typography, Dropdown, Empty } from 'antd';
import type { MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Eye, MoreVertical, Truck } from 'lucide-react';
import { NctsPageContainer, StatusBadge, TrackingId, CsvExportButton, DataFreshness } from '@ncts/ui';
import { useTransfers } from '@ncts/api-client';
import { useAuth } from '../../contexts/AuthContext';

const { Text } = Typography;

interface Transfer {
  id: string;
  transferNumber: string;
  status: string;
  senderTenant?: { name: string; tradingName?: string };
  senderFacility?: { name: string };
  receiverTenant?: { name: string; tradingName?: string };
  receiverFacility?: { name: string };
  initiatedAt: string;
  completedAt?: string | null;
  vehicleRegistration?: string | null;
  driverName?: string | null;
  items?: { quantityGrams: number }[];
}

const CSV_COLS = [
  { key: 'transferNumber', header: 'Transfer #' },
  { key: 'receiverName', header: 'Receiver' },
  { key: 'status', header: 'Status' },
  { key: 'totalGrams', header: 'Quantity (g)' },
  { key: 'initiatedAt', header: 'Initiated' },
];

export default function OutgoingTransfersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: transferData, isLoading, refetch } = useTransfers();

  const outgoing: Transfer[] = useMemo(() => {
    const raw = transferData?.data ?? transferData ?? [];
    const all = Array.isArray(raw) ? raw : [];
    // Filter to only transfers initiated by current tenant
    return all.filter((t: any) => t.senderTenantId === user?.tenantId || t.tenantId === user?.tenantId);
  }, [transferData, user?.tenantId]);

  const csvData = useMemo(() => outgoing.map(t => ({
    ...t,
    receiverName: t.receiverTenant?.tradingName ?? t.receiverTenant?.name ?? '—',
    totalGrams: t.items?.reduce((s, i) => s + Number(i.quantityGrams), 0) ?? 0,
  })), [outgoing]);

  const columns: ProColumns<Transfer>[] = [
    { title: 'Transfer #', dataIndex: 'transferNumber', render: (_, r) => <TrackingId id={r.transferNumber} linkTo={`/operator/transfers/${r.id}`} /> },
    { title: 'Receiver', key: 'receiver', render: (_, r) => <Text>{r.receiverTenant?.tradingName ?? r.receiverTenant?.name ?? '—'}</Text> },
    { title: 'Facility', key: 'receiverFac', render: (_, r) => r.receiverFacility?.name ?? '—' },
    { title: 'Quantity (g)', key: 'qty', render: (_, r) => (r.items?.reduce((s, i) => s + Number(i.quantityGrams), 0) ?? 0).toLocaleString() },
    { title: 'Status', dataIndex: 'status', render: (_, r) => <StatusBadge status={r.status === 'accepted' ? 'active' : r.status === 'rejected' ? 'rejected' : r.status === 'in_transit' ? 'in_transit' : 'pending'} /> },
    { title: 'Initiated', dataIndex: 'initiatedAt', render: (_, r) => dayjs(r.initiatedAt).format('DD MMM YYYY') },
    { title: '', key: 'actions', width: 48, render: (_, r) => { const items: MenuProps['items'] = [{ key: 'view', icon: <Eye size={14} />, label: 'View details' }]; return <Dropdown menu={{ items, onClick: () => navigate(`/operator/transfers/${r.id}`) }} trigger={['click']}><Button type="text" icon={<MoreVertical size={16} />} /></Dropdown>; } },
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Outgoing Transfers" subTitle={`${outgoing.length} outgoing transfers`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
        <Space>
          <CsvExportButton data={csvData} columns={CSV_COLS} filename="outgoing-transfers" />
          <Button type="primary" icon={<Truck size={16} />} onClick={() => navigate('/operator/transfers')}>New Transfer</Button>
        </Space>
      </div>
      {outgoing.length === 0 ? (
        <Empty description="No outgoing transfers yet" style={{ padding: '80px 0' }} />
      ) : (
        <ProTable<Transfer>
          columns={columns}
          dataSource={outgoing}
          rowKey="id"
          search={false}
          toolBarRender={false}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      )}
    </NctsPageContainer>
  );
}
