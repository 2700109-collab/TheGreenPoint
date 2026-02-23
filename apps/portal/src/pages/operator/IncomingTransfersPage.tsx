/**
 * IncomingTransfersPage — Transfers received by this operator.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spin, Space, Typography, Dropdown, Empty, message } from 'antd';
import type { MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Eye, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { NctsPageContainer, StatusBadge, TrackingId, CsvExportButton, DataFreshness } from '@ncts/ui';
import { useTransfers, apiClient } from '@ncts/api-client';
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
  receiverTenantId?: string;
  initiatedAt: string;
  completedAt?: string | null;
  items?: { quantityGrams: number }[];
}

const CSV_COLS = [
  { key: 'transferNumber', header: 'Transfer #' },
  { key: 'senderName', header: 'Sender' },
  { key: 'status', header: 'Status' },
  { key: 'totalGrams', header: 'Quantity (g)' },
  { key: 'initiatedAt', header: 'Initiated' },
];

export default function IncomingTransfersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: transferData, isLoading, refetch } = useTransfers();

  const incoming: Transfer[] = useMemo(() => {
    const raw = transferData?.data ?? transferData ?? [];
    const all = Array.isArray(raw) ? raw : [];
    return all.filter((t: any) => t.receiverTenantId === user?.tenantId);
  }, [transferData, user?.tenantId]);

  const csvData = useMemo(() => incoming.map(t => ({
    ...t,
    senderName: t.senderTenant?.tradingName ?? t.senderTenant?.name ?? '—',
    totalGrams: t.items?.reduce((s, i) => s + Number(i.quantityGrams), 0) ?? 0,
  })), [incoming]);

  async function handleAccept(id: string) {
    try { await apiClient.patch(`/transfers/${id}/accept`, {}); message.success('Transfer accepted'); refetch(); }
    catch { message.error('Failed to accept transfer'); }
  }
  async function handleReject(id: string) {
    try { await apiClient.patch(`/transfers/${id}/reject`, {}); message.success('Transfer rejected'); refetch(); }
    catch { message.error('Failed to reject transfer'); }
  }

  const columns: ProColumns<Transfer>[] = [
    { title: 'Transfer #', dataIndex: 'transferNumber', render: (_, r) => <TrackingId id={r.transferNumber} linkTo={`/operator/transfers/${r.id}`} /> },
    { title: 'Sender', key: 'sender', render: (_, r) => <Text>{r.senderTenant?.tradingName ?? r.senderTenant?.name ?? '—'}</Text> },
    { title: 'Facility', key: 'senderFac', render: (_, r) => r.senderFacility?.name ?? '—' },
    { title: 'Quantity (g)', key: 'qty', render: (_, r) => (r.items?.reduce((s, i) => s + Number(i.quantityGrams), 0) ?? 0).toLocaleString() },
    { title: 'Status', dataIndex: 'status', render: (_, r) => <StatusBadge status={r.status === 'accepted' ? 'active' : r.status === 'rejected' ? 'rejected' : 'pending'} /> },
    { title: 'Initiated', dataIndex: 'initiatedAt', render: (_, r) => dayjs(r.initiatedAt).format('DD MMM YYYY') },
    { title: '', key: 'actions', width: 120, render: (_, r) => {
      if (r.status === 'pending') return <Space><Button size="small" type="primary" icon={<CheckCircle size={14} />} onClick={() => handleAccept(r.id)}>Accept</Button><Button size="small" danger icon={<XCircle size={14} />} onClick={() => handleReject(r.id)}>Reject</Button></Space>;
      const items: MenuProps['items'] = [{ key: 'view', icon: <Eye size={14} />, label: 'View details' }];
      return <Dropdown menu={{ items, onClick: () => navigate(`/operator/transfers/${r.id}`) }} trigger={['click']}><Button type="text" icon={<MoreVertical size={16} />} /></Dropdown>;
    }},
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Incoming Transfers" subTitle={`${incoming.length} incoming transfers`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
        <CsvExportButton data={csvData} columns={CSV_COLS} filename="incoming-transfers" />
      </div>
      {incoming.length === 0 ? (
        <Empty description="No incoming transfers yet" style={{ padding: '80px 0' }} />
      ) : (
        <ProTable<Transfer>
          columns={columns}
          dataSource={incoming}
          rowKey="id"
          search={false}
          toolBarRender={false}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      )}
    </NctsPageContainer>
  );
}
