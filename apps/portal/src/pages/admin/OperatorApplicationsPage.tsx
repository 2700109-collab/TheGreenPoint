/**
 * OperatorApplicationsPage — Pending operator license applications.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag, Spin, Typography, Dropdown, Empty, message } from 'antd';
import type { MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Eye, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { NctsPageContainer, StatusBadge, DataFreshness } from '@ncts/ui';
import { useOperators } from '@ncts/api-client';

const { Text } = Typography;

interface Operator {
  id: string;
  name: string;
  tradingName?: string;
  registrationNumber?: string;
  province?: string;
  complianceStatus?: string;
  isActive?: boolean;
  createdAt?: string;
}

export default function OperatorApplicationsPage() {
  const navigate = useNavigate();
  const { data: opData, isLoading, refetch } = useOperators();
  const operators: Operator[] = useMemo(() => {
    const raw = opData?.data ?? opData ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [opData]);

  // Filter to recently created / inactive operators as "applications"
  const applications = useMemo(() => operators.filter(o => !o.isActive), [operators]);

  const columns: ProColumns<Operator>[] = [
    { title: 'Company', dataIndex: 'tradingName', render: (_, r) => <Text strong>{r.tradingName ?? r.name}</Text> },
    { title: 'Registration #', dataIndex: 'registrationNumber' },
    { title: 'Province', dataIndex: 'province', render: (_, r) => <Tag>{r.province ?? '—'}</Tag> },
    { title: 'Status', key: 'status', render: () => <StatusBadge status="pending" /> },
    { title: 'Submitted', dataIndex: 'createdAt', render: (_, r) => r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY') : '—' },
    { title: '', key: 'actions', width: 48, render: (_, r) => {
      const items: MenuProps['items'] = [
        { key: 'view', icon: <Eye size={14} />, label: 'Review application' },
        { key: 'approve', icon: <CheckCircle size={14} />, label: 'Approve' },
        { key: 'reject', icon: <XCircle size={14} />, label: 'Reject' },
      ];
      return <Dropdown menu={{ items, onClick: ({ key }) => { if (key === 'view') navigate(`/admin/operators/${r.id}`); else message.info(`${key} action — coming in Phase 5`); } }} trigger={['click']}><Button type="text" icon={<MoreVertical size={16} />} /></Dropdown>;
    }},
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Operator Applications" subTitle={`${applications.length} pending applications`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
      </div>
      {applications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No pending applications" style={{ padding: '80px 0' }}>
          <Text type="secondary">All operator applications have been processed.</Text>
        </Empty>
      ) : (
        <ProTable<Operator> columns={columns} dataSource={applications} rowKey="id" search={false} toolBarRender={false} pagination={{ pageSize: 20 }} />
      )}
    </NctsPageContainer>
  );
}
