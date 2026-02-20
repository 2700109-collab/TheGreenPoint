import { useState } from 'react';
import { Typography, Button, Table, Tag, Space, Spin, Alert } from 'antd';
import { PlusOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useFacilities } from '@ncts/api-client';
import type { Facility } from '@ncts/shared-types';

const { Title } = Typography;

const columns = [
  {
    title: 'Facility',
    dataIndex: 'name',
    key: 'name',
    render: (text: string) => (
      <Space>
        <EnvironmentOutlined />
        {text}
      </Space>
    ),
  },
  {
    title: 'Type',
    dataIndex: 'facilityType',
    key: 'facilityType',
    render: (t: string) => t.charAt(0).toUpperCase() + t.slice(1),
  },
  { title: 'Province', dataIndex: 'province', key: 'province' },
  { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true },
  {
    title: 'Status',
    dataIndex: 'isActive',
    key: 'isActive',
    render: (active: boolean) => (
      <Tag color={active ? 'green' : 'red'}>{active ? 'ACTIVE' : 'INACTIVE'}</Tag>
    ),
  },
];

export default function FacilitiesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useFacilities({ page, limit: 20 });

  if (error) return <Alert type="error" message="Failed to load facilities" showIcon />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 0 }}>Facilities</Title>
        <Button type="primary" icon={<PlusOutlined />}>Register Facility</Button>
      </div>
      <Spin spinning={isLoading}>
        <Table<Facility>
          columns={columns}
          dataSource={data?.data}
          rowKey="id"
          pagination={{
            current: data?.meta?.page ?? 1,
            pageSize: data?.meta?.limit ?? 20,
            total: data?.meta?.total ?? 0,
            onChange: (p) => setPage(p),
          }}
        />
      </Spin>
    </div>
  );
}
