/**
 * PermitsPage — Government permit oversight with ProTable, tabs, CSV export.
 * Per FrontEnd.md §4.3.
 */

import React, { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Tabs, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import {
  Eye,
  CheckCircle,
  ShieldOff,
  XOctagon,
  MoreVertical,
} from 'lucide-react';
import {
  StatusBadge,
  TrackingId,
  NctsPageContainer,
  CsvExportButton,
  DataFreshness,
} from '@ncts/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PermitType = 'cultivation' | 'processing' | 'distribution' | 'retail';
type PermitStatus = 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';

interface Permit {
  id: string;
  permitNumber: string;
  operatorId: string;
  operatorName: string;
  type: PermitType;
  status: PermitStatus;
  issuedDate: string;
  expiryDate: string;
  conditionsCount: number;
  unmetConditions: number;
  province: string;
}

// ---------------------------------------------------------------------------
// Permit type → Tag colour
// ---------------------------------------------------------------------------

const TYPE_COLOR: Record<PermitType, string> = {
  cultivation: 'green',
  processing: 'blue',
  distribution: 'orange',
  retail: 'purple',
};

// ---------------------------------------------------------------------------
// Mock Data — 10 permits
// ---------------------------------------------------------------------------

const MOCK_PERMITS: Permit[] = [
  {
    id: 'pm-1', permitNumber: 'PRM-20250210-GRN', operatorId: 'op-1',
    operatorName: 'GreenLeaf Holdings', type: 'cultivation', status: 'active',
    issuedDate: '2025-02-10', expiryDate: '2026-08-10',
    conditionsCount: 5, unmetConditions: 0, province: 'Gauteng',
  },
  {
    id: 'pm-2', permitNumber: 'PRM-20250318-CCC', operatorId: 'op-2',
    operatorName: 'Cape Cannabis Co', type: 'processing', status: 'active',
    issuedDate: '2025-03-18', expiryDate: '2026-03-18',
    conditionsCount: 8, unmetConditions: 1, province: 'Western Cape',
  },
  {
    id: 'pm-3', permitNumber: 'PRM-20250405-DBL', operatorId: 'op-3',
    operatorName: 'Durban Botanicals', type: 'distribution', status: 'pending',
    issuedDate: '2025-04-05', expiryDate: '2026-04-05',
    conditionsCount: 4, unmetConditions: 2, province: 'KwaZulu-Natal',
  },
  {
    id: 'pm-4', permitNumber: 'PRM-20250512-HVG', operatorId: 'op-4',
    operatorName: 'Highveld Growers', type: 'cultivation', status: 'suspended',
    issuedDate: '2025-05-12', expiryDate: '2026-05-12',
    conditionsCount: 6, unmetConditions: 3, province: 'Mpumalanga',
  },
  {
    id: 'pm-5', permitNumber: 'PRM-20250619-ERT', operatorId: 'op-5',
    operatorName: 'Eastern Roots Trading', type: 'distribution', status: 'active',
    issuedDate: '2025-06-19', expiryDate: '2026-12-19',
    conditionsCount: 3, unmetConditions: 0, province: 'Eastern Cape',
  },
  {
    id: 'pm-6', permitNumber: 'PRM-20250703-FSE', operatorId: 'op-6',
    operatorName: 'Free State Extracts', type: 'processing', status: 'revoked',
    issuedDate: '2025-07-03', expiryDate: '2026-07-03',
    conditionsCount: 7, unmetConditions: 5, province: 'Free State',
  },
  {
    id: 'pm-7', permitNumber: 'PRM-20250820-LLI', operatorId: 'op-7',
    operatorName: 'Limpopo Leaf Industries', type: 'cultivation', status: 'active',
    issuedDate: '2025-08-20', expiryDate: '2026-04-01',
    conditionsCount: 4, unmetConditions: 0, province: 'Limpopo',
  },
  {
    id: 'pm-8', permitNumber: 'PRM-20250910-GRD', operatorId: 'op-8',
    operatorName: 'Garden Route Dispensary', type: 'retail', status: 'pending',
    issuedDate: '2025-09-10', expiryDate: '2026-09-10',
    conditionsCount: 5, unmetConditions: 1, province: 'Western Cape',
  },
  {
    id: 'pm-9', permitNumber: 'PRM-20251015-NWN', operatorId: 'op-9',
    operatorName: 'North West Naturals', type: 'cultivation', status: 'expired',
    issuedDate: '2024-10-15', expiryDate: '2025-10-15',
    conditionsCount: 6, unmetConditions: 4, province: 'North West',
  },
  {
    id: 'pm-10', permitNumber: 'PRM-20251128-PPL', operatorId: 'op-10',
    operatorName: 'Pretoria Phyto Labs', type: 'processing', status: 'expired',
    issuedDate: '2024-11-28', expiryDate: '2026-02-01',
    conditionsCount: 3, unmetConditions: 2, province: 'Gauteng',
  },
];

// ---------------------------------------------------------------------------
// CSV export column config
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { key: 'permitNumber', header: 'Permit #' },
  { key: 'operatorName', header: 'Operator' },
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'issuedDate', header: 'Issued Date' },
  { key: 'expiryDate', header: 'Expiry Date' },
  { key: 'conditionsCount', header: 'Conditions' },
  { key: 'province', header: 'Province' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expiryLabel(expiryDate: string): React.ReactNode {
  const now = dayjs();
  const exp = dayjs(expiryDate);
  const diff = exp.diff(now, 'day');

  if (diff < 0) {
    return (
      <span>
        {exp.format('DD MMM YYYY')}{' '}
        <span style={{ color: '#ff4d4f', fontSize: 12 }}>
          (Expired {Math.abs(diff)}d ago)
        </span>
      </span>
    );
  }
  if (diff <= 60) {
    return (
      <span>
        {exp.format('DD MMM YYYY')}{' '}
        <span style={{ color: '#faad14', fontSize: 12 }}>
          ({diff}d left)
        </span>
      </span>
    );
  }
  return (
    <span>
      {exp.format('DD MMM YYYY')}{' '}
      <span style={{ color: '#52c41a', fontSize: 12 }}>
        ({diff}d left)
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PermitsPage() {
  const actionRef = useRef<ActionType>(undefined);
  const navigate = useNavigate();

  // -- Tab counts -------------------------------------------------------------
  const counts = useMemo(() => {
    const total = MOCK_PERMITS.length;
    const pending = MOCK_PERMITS.filter((p) => p.status === 'pending').length;
    const active = MOCK_PERMITS.filter((p) => p.status === 'active').length;
    const expired = MOCK_PERMITS.filter((p) => p.status === 'expired').length;
    const suspendedRevoked = MOCK_PERMITS.filter(
      (p) => p.status === 'suspended' || p.status === 'revoked',
    ).length;
    return { total, pending, active, expired, suspendedRevoked };
  }, []);

  // -- Tab filter state -------------------------------------------------------
  const [activeTab, setActiveTab] = React.useState<string>('all');

  const filteredData = useMemo(() => {
    if (activeTab === 'all') return MOCK_PERMITS;
    if (activeTab === 'suspended_revoked') {
      return MOCK_PERMITS.filter(
        (p) => p.status === 'suspended' || p.status === 'revoked',
      );
    }
    return MOCK_PERMITS.filter((p) => p.status === activeTab);
  }, [activeTab]);

  // -- Action dropdown builder ------------------------------------------------
  const buildActions = (record: Permit): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'review',
        icon: <Eye size={14} />,
        label: 'Review',
        onClick: () => navigate(`/permits/${record.id}`),
      },
    ];

    if (record.status === 'pending') {
      items.push({
        key: 'approve',
        icon: <CheckCircle size={14} />,
        label: 'Approve',
      });
    }

    if (record.status === 'active' || record.status === 'pending') {
      items.push({
        key: 'suspend',
        icon: <ShieldOff size={14} />,
        label: 'Suspend',
      });
    }

    if (record.status !== 'revoked' && record.status !== 'expired') {
      items.push({
        key: 'revoke',
        icon: <XOctagon size={14} />,
        label: 'Revoke',
        danger: true,
      });
    }

    return items;
  };

  // -- ProTable columns -------------------------------------------------------
  const columns: ProColumns<Permit>[] = [
    {
      title: 'Permit #',
      dataIndex: 'permitNumber',
      width: 180,
      render: (_, record) => (
        <TrackingId
          id={record.permitNumber}
          size="sm"
          copyable
          linkTo={`/permits/${record.id}`}
        />
      ),
    },
    {
      title: 'Operator',
      dataIndex: 'operatorName',
      width: 180,
      render: (_, record) => (
        <a
          onClick={() => navigate(`/operators/${record.operatorId}`)}
          style={{ cursor: 'pointer', color: '#1677ff' }}
        >
          {record.operatorName}
        </a>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 130,
      render: (_, record) => (
        <Tag color={TYPE_COLOR[record.type]}>
          {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
        </Tag>
      ),
      valueEnum: {
        cultivation: { text: 'Cultivation' },
        processing: { text: 'Processing' },
        distribution: { text: 'Distribution' },
        retail: { text: 'Retail' },
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (_, record) => (
        <StatusBadge status={record.status as any} />
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
      title: 'Issued Date',
      dataIndex: 'issuedDate',
      width: 120,
      search: false,
      render: (_, record) => dayjs(record.issuedDate).format('DD MMM YYYY'),
      sorter: (a, b) => dayjs(a.issuedDate).unix() - dayjs(b.issuedDate).unix(),
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      width: 120,
      search: false,
      render: (_, record) => expiryLabel(record.expiryDate),
      sorter: (a, b) => dayjs(a.expiryDate).unix() - dayjs(b.expiryDate).unix(),
    },
    {
      title: 'Conditions',
      dataIndex: 'conditionsCount',
      width: 80,
      search: false,
      render: (_, record) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {record.conditionsCount}
          {record.unmetConditions > 0 && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#ff4d4f',
                display: 'inline-block',
              }}
              title={`${record.unmetConditions} unmet`}
            />
          )}
        </span>
      ),
      sorter: (a, b) => a.conditionsCount - b.conditionsCount,
    },
    {
      title: 'Province',
      dataIndex: 'province',
      width: 120,
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 120,
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
      title="Permits Management"
      subTitle="Government permit oversight"
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DataFreshness lastUpdated={new Date().toISOString()} />
          <CsvExportButton
            data={MOCK_PERMITS}
            columns={CSV_COLUMNS}
            filename="permits-export"
          />
        </div>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 16 }}
        items={[
          { key: 'all', label: `All Permits (${counts.total})` },
          { key: 'pending', label: `Pending Review (${counts.pending})` },
          { key: 'active', label: `Active (${counts.active})` },
          { key: 'expired', label: `Expired (${counts.expired})` },
          {
            key: 'suspended_revoked',
            label: `Suspended / Revoked (${counts.suspendedRevoked})`,
          },
        ]}
      />

      <ProTable<Permit>
        actionRef={actionRef}
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        search={{ filterType: 'light' }}
        options={{ density: true, fullScreen: true, reload: true, setting: true }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}–${range[1]} of ${total} permits`,
        }}
        toolBarRender={false}
        scroll={{ x: 1200 }}
        dateFormatter="string"
        headerTitle={undefined}
      />
    </NctsPageContainer>
  );
}
