/**
 * OperatorsPage — Registered cannabis operators with ProTable, CSV export, and compliance overview.
 * Per FrontEnd.md §4.2.
 */

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Spin, Tag } from 'antd';
import { useOperators } from '@ncts/api-client';
import type { MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Eye, Ban, Flag, MoreVertical } from 'lucide-react';
import {
  StatusBadge,
  TrackingId,
  NctsPageContainer,
  CsvExportButton,
  DataFreshness,
  ComplianceScore,
} from '@ncts/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LicenseType = 'cultivation' | 'processing' | 'distribution' | 'retail' | 'combined';
type PermitStatus = 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';

interface Operator {
  id: string;
  name: string;
  registrationNumber: string;
  licenseType: LicenseType;
  province: string;
  facilityCount: number;
  plantCount: number;
  complianceScore: number;
  permitStatus: PermitStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// License type → Tag colour
// ---------------------------------------------------------------------------

const LICENSE_COLOR: Record<LicenseType, string> = {
  cultivation: 'green',
  processing: 'blue',
  distribution: 'orange',
  retail: 'purple',
  combined: 'geekblue',
};



// ---------------------------------------------------------------------------
// CSV columns
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { key: 'name', header: 'Operator Name' },
  { key: 'registrationNumber', header: 'Registration #' },
  { key: 'licenseType', header: 'License Type' },
  { key: 'province', header: 'Province' },
  { key: 'facilityCount', header: 'Facilities' },
  { key: 'plantCount', header: 'Active Plants' },
  { key: 'complianceScore', header: 'Compliance %' },
  { key: 'permitStatus', header: 'Permit Status' },
  { key: 'createdAt', header: 'Registered' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OperatorsPage() {
  const actionRef = useRef<ActionType>(undefined);
  const navigate = useNavigate();
  const { data: operatorsResponse, isLoading } = useOperators({ limit: 100 });

  const operators: Operator[] = (operatorsResponse?.data?.data ?? operatorsResponse?.data ?? []).map((op: any) => ({
    id: op.id,
    name: op.name ?? op.companyName ?? '',
    registrationNumber: op.registrationNumber ?? op.id,
    licenseType: (op.licenseType ?? 'cultivation') as LicenseType,
    province: op.province ?? '',
    facilityCount: op.facilityCount ?? 0,
    plantCount: op.plantCount ?? 0,
    complianceScore: op.complianceScore ?? 0,
    permitStatus: (op.permitStatus ?? 'active') as PermitStatus,
    createdAt: op.createdAt ?? '',
  }));

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  // -- Action dropdown builder ------------------------------------------------
  const buildActions = (record: Operator): MenuProps['items'] => [
    {
      key: 'view',
      icon: <Eye size={14} />,
      label: 'View Details',
      onClick: () => navigate(`/operators/${record.id}`),
    },
    {
      key: 'suspend',
      icon: <Ban size={14} />,
      label: 'Suspend',
    },
    {
      key: 'flag',
      icon: <Flag size={14} />,
      label: 'Flag',
    },
  ];

  // -- ProTable columns -------------------------------------------------------
  const columns: ProColumns<Operator>[] = [
    {
      title: 'Operator Name',
      dataIndex: 'name',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar
            size={32}
            style={{ backgroundColor: '#1677ff', fontSize: 14, flexShrink: 0 }}
          >
            {record.name.charAt(0)}
          </Avatar>
          <span style={{ fontWeight: 500 }}>{record.name}</span>
        </div>
      ),
    },
    {
      title: 'Registration #',
      dataIndex: 'registrationNumber',
      width: 160,
      render: (_, record) => <TrackingId id={record.registrationNumber} size="sm" copyable />,
    },
    {
      title: 'License Type',
      dataIndex: 'licenseType',
      width: 130,
      render: (_, record) => (
        <Tag color={LICENSE_COLOR[record.licenseType]}>
          {record.licenseType.charAt(0).toUpperCase() + record.licenseType.slice(1)}
        </Tag>
      ),
      valueEnum: {
        cultivation: { text: 'Cultivation' },
        processing: { text: 'Processing' },
        distribution: { text: 'Distribution' },
        retail: { text: 'Retail' },
        combined: { text: 'Combined' },
      },
    },
    {
      title: 'Province',
      dataIndex: 'province',
      width: 130,
    },
    {
      title: 'Facilities',
      dataIndex: 'facilityCount',
      width: 80,
      search: false,
      sorter: (a, b) => a.facilityCount - b.facilityCount,
    },
    {
      title: 'Active Plants',
      dataIndex: 'plantCount',
      width: 100,
      search: false,
      render: (_, record) => record.plantCount.toLocaleString(),
      sorter: (a, b) => a.plantCount - b.plantCount,
    },
    {
      title: 'Compliance',
      dataIndex: 'complianceScore',
      width: 100,
      search: false,
      sorter: (a, b) => a.complianceScore - b.complianceScore,
      render: (_, record) => (
        <ComplianceScore score={record.complianceScore} size="sm" />
      ),
    },
    {
      title: 'Permit Status',
      dataIndex: 'permitStatus',
      width: 120,
      render: (_, record) => (
        <StatusBadge status={record.permitStatus as any} />
      ),
      valueEnum: {
        pending: { text: 'Pending' },
        active: { text: 'Active' },
        suspended: { text: 'Suspended' },
        revoked: { text: 'Revoked' },
        expired: { text: 'Expired' },
      },
    },
    {
      title: 'Registered',
      dataIndex: 'createdAt',
      width: 120,
      search: false,
      render: (_, record) => dayjs(record.createdAt).format('DD MMM YYYY'),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 100,
      render: (_, record) => (
        <Dropdown menu={{ items: buildActions(record) }} trigger={['click']}>
          <MoreVertical
            size={16}
            style={{ cursor: 'pointer', color: '#595959' }}
          />
        </Dropdown>
      ),
    },
  ];

  // -- Render -----------------------------------------------------------------
  return (
    <NctsPageContainer
      title="Operators"
      subTitle="Registered cannabis operators"
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DataFreshness lastUpdated={new Date().toISOString()} />
          <CsvExportButton
            data={operators}
            columns={CSV_COLUMNS}
            filename="operators-export"
          />
        </div>
      }
    >
      <ProTable<Operator>
        actionRef={actionRef}
        columns={columns}
        dataSource={operators}
        rowKey="id"
        search={{ filterType: 'light' }}
        options={{ density: true, fullScreen: true, reload: true, setting: true }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} operators`,
        }}
        toolBarRender={false}
        scroll={{ x: 1200 }}
        dateFormatter="string"
        headerTitle={undefined}
      />
    </NctsPageContainer>
  );
}
