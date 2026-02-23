/**
 * PendingPermitsPage — Permits awaiting review.
 */
import { useMemo } from 'react';
import { Button, Tag, Spin, Empty, message } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { CheckCircle, XCircle } from 'lucide-react';
import { NctsPageContainer, StatusBadge, TrackingId, DataFreshness } from '@ncts/ui';
import { usePermits, useUpdatePermitStatus } from '@ncts/api-client';

interface Permit {
  id: string;
  permitNumber: string;
  permitType: string;
  status: string;
  issueDate?: string;
  expiryDate?: string;
  tenant?: { name: string };
  facility?: { name: string };
}

export default function PendingPermitsPage() {
  const { data: permitData, isLoading, refetch } = usePermits();
  const updateStatus = useUpdatePermitStatus();

  const pending: Permit[] = useMemo(() => {
    const raw = permitData?.data ?? permitData ?? [];
    return (Array.isArray(raw) ? raw : []).filter((p: any) => p.status === 'pending' || p.status === 'under_review');
  }, [permitData]);

  async function handleAction(id: string, status: string) {
    try { await updateStatus.mutateAsync({ id, status }); message.success(`Permit ${status}`); refetch(); }
    catch { message.error('Action failed'); }
  }

  const columns: ProColumns<Permit>[] = [
    { title: 'Permit #', dataIndex: 'permitNumber', render: (_, r) => <TrackingId id={r.permitNumber} linkTo={`/admin/permits/${r.id}`} /> },
    { title: 'Type', dataIndex: 'permitType', render: (_, r) => <Tag color="blue">{r.permitType?.replace(/_/g, ' ')}</Tag> },
    { title: 'Operator', key: 'tenant', render: (_, r) => r.tenant?.name ?? '—' },
    { title: 'Facility', key: 'facility', render: (_, r) => r.facility?.name ?? '—' },
    { title: 'Submitted', dataIndex: 'issueDate', render: (_, r) => r.issueDate ? dayjs(r.issueDate).format('DD MMM YYYY') : '—' },
    { title: 'Status', dataIndex: 'status', render: () => <StatusBadge status="pending" /> },
    { title: '', key: 'actions', width: 160, render: (_, r) => (
      <span style={{ display: 'flex', gap: 4 }}>
        <Button size="small" type="primary" icon={<CheckCircle size={14} />} onClick={() => handleAction(r.id, 'active')}>Approve</Button>
        <Button size="small" danger icon={<XCircle size={14} />} onClick={() => handleAction(r.id, 'rejected')}>Reject</Button>
      </span>
    )},
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Pending Permits" subTitle={`${pending.length} permits awaiting review`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
      </div>
      {pending.length === 0 ? (
        <Empty description="No pending permits" style={{ padding: '80px 0' }} />
      ) : (
        <ProTable<Permit> columns={columns} dataSource={pending} rowKey="id" search={false} toolBarRender={false} pagination={{ pageSize: 20 }} />
      )}
    </NctsPageContainer>
  );
}
