import { useState } from 'react';
import { Typography, Table, Tag, Descriptions, Spin, Alert, Card, Progress } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { useLabResults } from '@ncts/api-client';
import type { LabResult } from '@ncts/shared-types';

const { Title } = Typography;

const columns = [
  {
    title: 'Lab Name',
    dataIndex: 'labName',
    key: 'labName',
  },
  {
    title: 'Accreditation',
    dataIndex: 'labAccreditationNumber',
    key: 'labAccreditationNumber',
    render: (t: string) => <span style={{ fontFamily: 'monospace' }}>{t}</span>,
  },
  {
    title: 'Test Date',
    dataIndex: 'testDate',
    key: 'testDate',
    render: (d: string) => new Date(d).toLocaleDateString('en-ZA'),
  },
  {
    title: 'THC %',
    dataIndex: 'thcPercent',
    key: 'thcPercent',
    render: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    title: 'CBD %',
    dataIndex: 'cbdPercent',
    key: 'cbdPercent',
    render: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    title: 'Total Cannabinoids',
    dataIndex: 'totalCannabinoidsPercent',
    key: 'totalCannabinoidsPercent',
    render: (v: number) => <Progress percent={v} size="small" />,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (s: string) => {
      const colors: Record<string, string> = { pass: 'green', fail: 'red', pending: 'gold' };
      return <Tag color={colors[s] || 'default'}>{s.toUpperCase()}</Tag>;
    },
  },
  {
    title: 'Contaminants',
    key: 'contaminants',
    render: (_: unknown, r: LabResult) => {
      const allPass = r.pesticidesPass && r.heavyMetalsPass && r.microbialsPass && r.mycotoxinsPass;
      return <Tag color={allPass ? 'green' : 'red'}>{allPass ? 'ALL CLEAR' : 'ISSUES'}</Tag>;
    },
  },
];

export default function LabResultsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useLabResults({ page, limit: 20 });

  if (error) return <Alert type="error" message="Failed to load lab results" showIcon />;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        <SafetyCertificateOutlined style={{ marginRight: 8 }} />
        Lab Results (Certificates of Analysis)
      </Title>
      <Spin spinning={isLoading}>
        <Table<LabResult>
          columns={columns}
          dataSource={data?.data}
          rowKey="id"
          expandable={{
            expandedRowRender: (record) => (
              <Card size="small">
                <Descriptions column={4} size="small">
                  <Descriptions.Item label="CBN %">{record.cbnPercent?.toFixed(1) ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="CBG %">{record.cbgPercent?.toFixed(1) ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Moisture %">{record.moisturePercent?.toFixed(1) ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Pesticides">{record.pesticidesPass ? 'Pass' : 'Fail'}</Descriptions.Item>
                  <Descriptions.Item label="Heavy Metals">{record.heavyMetalsPass ? 'Pass' : 'Fail'}</Descriptions.Item>
                  <Descriptions.Item label="Microbials">{record.microbialsPass ? 'Pass' : 'Fail'}</Descriptions.Item>
                  <Descriptions.Item label="Mycotoxins">{record.mycotoxinsPass ? 'Pass' : 'Fail'}</Descriptions.Item>
                  <Descriptions.Item label="Terpenes">
                    {record.terpeneProfile
                      ? Object.entries(record.terpeneProfile)
                          .map(([k, v]) => `${k}: ${v}%`)
                          .join(', ')
                      : '—'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          }}
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
