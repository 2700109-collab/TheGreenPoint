/**
 * ComplianceAlertsPage — Active compliance alerts requiring attention.
 */
import { useMemo, useState } from 'react';
import { Tabs, Tag, Spin, Typography, Empty } from 'antd';
import type { TabsProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { NctsPageContainer, DataFreshness } from '@ncts/ui';
import { useComplianceAlerts } from '@ncts/api-client';

const { Text } = Typography;

interface Alert {
  id: string;
  type: string;
  severity: string;
  description?: string;
  operatorName?: string;
  facilityName?: string;
  createdAt?: string;
}

const SEVERITY_COLOR: Record<string, string> = { critical: 'red', warning: 'orange', info: 'blue' };
const SEVERITY_ICON: Record<string, React.ReactNode> = { critical: <ShieldAlert size={14} />, warning: <AlertTriangle size={14} />, info: <Info size={14} /> };

export default function ComplianceAlertsPage() {
  const { data: alertData, isLoading, refetch } = useComplianceAlerts();
  const alerts: Alert[] = useMemo(() => {
    const raw = (alertData as any)?.data ?? alertData ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [alertData]);
  const [tab, setTab] = useState('all');

  const filtered = useMemo(() => tab === 'all' ? alerts : alerts.filter(a => a.severity === tab), [alerts, tab]);
  const counts = useMemo(() => ({
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  }), [alerts]);

  const tabs: TabsProps['items'] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'critical', label: `Critical (${counts.critical})` },
    { key: 'warning', label: `Warning (${counts.warning})` },
    { key: 'info', label: `Info (${counts.info})` },
  ];

  const columns: ProColumns<Alert>[] = [
    { title: 'Severity', dataIndex: 'severity', width: 100, render: (_, r) => <Tag color={SEVERITY_COLOR[r.severity] ?? 'default'} icon={SEVERITY_ICON[r.severity]}>{r.severity}</Tag> },
    { title: 'Alert', dataIndex: 'description', ellipsis: true, render: (_, r) => <Text strong>{r.description ?? '—'}</Text> },
    { title: 'Facility', dataIndex: 'facilityName' },
    { title: 'Operator', dataIndex: 'operatorName' },
    { title: 'Type', dataIndex: 'type', render: (_, r) => <Tag>{r.type?.replace(/_/g, ' ')}</Tag> },
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Compliance Alerts" subTitle={`${alerts.length} active alerts`}>
      <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
      <Tabs items={tabs} activeKey={tab} onChange={setTab} style={{ marginBottom: 16 }} />
      {filtered.length === 0 ? (
        <Empty description="No active alerts" style={{ padding: '80px 0' }} />
      ) : (
        <ProTable<Alert> columns={columns} dataSource={filtered} rowKey="id" search={false} toolBarRender={false} pagination={{ pageSize: 20 }} />
      )}
    </NctsPageContainer>
  );
}
