import { useState } from 'react';
import { Table, Tag, Spin } from 'antd';
import { useFacilities } from '@ncts/api-client';
import type { Facility } from '@ncts/shared-types';

const typeColors: Record<string, string> = { cultivation: 'green', processing: 'blue', distribution: 'purple', retail: 'orange', laboratory: 'cyan' };

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', render: (t: string) => <span style={{ fontWeight: 500 }}>{t}</span> },
  { title: 'Type', dataIndex: 'facilityType', key: 'type', render: (t: string) => <Tag color={typeColors[t] ?? 'default'}>{t}</Tag> },
  { title: 'Province', dataIndex: 'province', key: 'province' },
  { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true },
  { title: 'Status', dataIndex: 'isActive', key: 'status', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
];

export default function FacilitiesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFacilities({ page, limit: 20 });

  return (
    <div>
      <div className="page-header"><h2>Facilities</h2></div>
      <div className="content-card" style={{ padding: 0 }}>
        <Spin spinning={isLoading}>
          <Table<Facility> columns={columns} dataSource={data?.data} rowKey="id"
            pagination={{ current: data?.meta?.page ?? 1, pageSize: 20, total: data?.meta?.total ?? 0, onChange: setPage, showSizeChanger: false }}
          />
        </Spin>
      </div>
    </div>
  );
}
