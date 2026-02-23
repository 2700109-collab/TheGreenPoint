/**
 * TrackingTransfersPage — National transfer monitoring (cross-tenant).
 */
import { useMemo, useState } from 'react';
import { Tabs, Spin } from 'antd';
import type { TabsProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { NctsPageContainer, StatusBadge, TrackingId, CsvExportButton, DataFreshness } from '@ncts/ui';
import { useTransfers } from '@ncts/api-client';

interface Transfer {
  id: string;
  transferNumber: string;
  status: string;
  senderTenant?: { name: string; tradingName?: string };
  receiverTenant?: { name: string; tradingName?: string };
  senderFacility?: { name: string };
  receiverFacility?: { name: string };
  initiatedAt: string;
  completedAt?: string;
  items?: { quantityGrams: number }[];
}

const CSV_COLS = [
  { key: 'transferNumber', header: 'Transfer #' },
  { key: 'senderName', header: 'Sender' },
  { key: 'receiverName', header: 'Receiver' },
  { key: 'status', header: 'Status' },
  { key: 'totalGrams', header: 'Quantity (g)' },
  { key: 'initiatedAt', header: 'Date' },
];

export default function TrackingTransfersPage() {
  const { data: tData, isLoading, refetch } = useTransfers();
  const transfers: Transfer[] = useMemo(() => {
    const raw = tData?.data ?? tData ?? [];
    return (Array.isArray(raw) ? raw : []).map((t: any) => ({ ...t, senderName: t.senderTenant?.tradingName ?? t.senderTenant?.name ?? '—', receiverName: t.receiverTenant?.tradingName ?? t.receiverTenant?.name ?? '—', totalGrams: t.items?.reduce((s: number, i: any) => s + Number(i.quantityGrams), 0) ?? 0 }));
  }, [tData]);

  const [tab, setTab] = useState('all');
  const filtered = useMemo(() => tab === 'all' ? transfers : transfers.filter(t => t.status === tab), [transfers, tab]);
  const counts = useMemo(() => ({ all: transfers.length, pending: transfers.filter(t => t.status === 'pending').length, in_transit: transfers.filter(t => t.status === 'in_transit').length, accepted: transfers.filter(t => t.status === 'accepted').length, rejected: transfers.filter(t => t.status === 'rejected').length }), [transfers]);

  const tabs: TabsProps['items'] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'pending', label: `Pending (${counts.pending})` },
    { key: 'accepted', label: `Completed (${counts.accepted})` },
  ];

  const columns: ProColumns<Transfer>[] = [
    { title: 'Transfer #', dataIndex: 'transferNumber', render: (_, r) => <TrackingId id={r.transferNumber} /> },
    { title: 'Sender', key: 'sender', render: (_, r) => r.senderTenant?.tradingName ?? r.senderTenant?.name ?? '—' },
    { title: 'Receiver', key: 'receiver', render: (_, r) => r.receiverTenant?.tradingName ?? r.receiverTenant?.name ?? '—' },
    { title: 'Quantity (g)', key: 'qty', render: (_, r) => ((r as any).totalGrams ?? 0).toLocaleString() },
    { title: 'Status', dataIndex: 'status', render: (_, r) => <StatusBadge status={r.status === 'accepted' ? 'active' : r.status === 'rejected' ? 'rejected' : 'pending'} /> },
    { title: 'Initiated', dataIndex: 'initiatedAt', render: (_, r) => dayjs(r.initiatedAt).format('DD MMM YYYY') },
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Transfer Monitoring" subTitle={`${transfers.length} transfers tracked`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
        <CsvExportButton data={filtered} columns={CSV_COLS} filename="national-transfers" />
      </div>
      <Tabs items={tabs} activeKey={tab} onChange={setTab} style={{ marginBottom: 16 }} />
      <ProTable<Transfer> columns={columns} dataSource={filtered} rowKey="id" search={false} toolBarRender={false} pagination={{ pageSize: 20, showSizeChanger: true }} />
    </NctsPageContainer>
  );
}
