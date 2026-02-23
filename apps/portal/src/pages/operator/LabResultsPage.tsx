/**
 * LabResultsPage — THC/CBD potency & contaminant testing with ProTable and expandable detail panels.
 * Per FrontEnd.md §3.7.
 */

import { useMemo, useRef } from 'react';
import { Card, Row, Col, Tag, Button, Descriptions, Progress, Typography, Space, Divider, Spin } from 'antd';
import { useLabResults } from '@ncts/api-client';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Eye, FileDown } from 'lucide-react';
import {
  StatusBadge,
  TrackingId,
  NctsPageContainer,
  CsvExportButton,
  DataFreshness,
} from '@ncts/ui';

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TerpeneProfile {
  myrcene: number;
  limonene: number;
  pinene: number;
}

interface ContaminantScreen {
  pesticides: boolean;
  heavyMetals: boolean;
  microbials: boolean;
  mycotoxins: boolean;
  residualSolvents: boolean;
}

interface CannabinoidProfile {
  thcPercent: number;
  cbdPercent: number;
  cbnPercent: number;
  cbgPercent: number;
}

interface LabResult {
  id: string;
  sampleId: string;
  harvestId: string;
  labName: string;
  submittedDate: string;
  resultDate: string | null;
  status: 'passed' | 'failed' | 'pending' | 'in_progress';
  thcPercent: number;
  cbdPercent: number;
  cannabinoids: CannabinoidProfile;
  terpenes: TerpeneProfile;
  contaminants: ContaminantScreen;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THC_THRESHOLD = 20; // % — TODO: source from backend compliance config



// ---------------------------------------------------------------------------
// CSV columns for export
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { key: 'sampleId', header: 'Sample ID' },
  { key: 'harvestId', header: 'Harvest ID' },
  { key: 'labName', header: 'Lab Name' },
  { key: 'submittedDate', header: 'Submitted Date' },
  { key: 'resultDate', header: 'Result Date', formatter: (v: string | null) => v ?? 'Pending' },
  { key: 'status', header: 'Status' },
  { key: 'thcPercent', header: 'THC %', formatter: (v: number) => v.toFixed(1) },
  { key: 'cbdPercent', header: 'CBD %', formatter: (v: number) => v.toFixed(1) },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function passFail(pass: boolean) {
  return (
    <Tag
      color={pass ? 'success' : 'error'}
      style={{ minWidth: 52, textAlign: 'center', fontWeight: 600 }}
    >
      {pass ? '✅ Pass' : '❌ Fail'}
    </Tag>
  );
}

function cannabinoidRow(label: string, value: number, threshold: number | null) {
  const isOverThreshold = threshold !== null && value > threshold;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <Text strong style={{ fontSize: 13 }}>{label}</Text>
        <Space size={4}>
          <Text style={{ fontSize: 13, color: isOverThreshold ? '#CF1322' : undefined }}>
            {value.toFixed(2)}%
          </Text>
          {threshold !== null && (
            <span style={{ fontSize: 12 }}>{isOverThreshold ? '❌' : '✅'}</span>
          )}
        </Space>
      </div>
      <Progress
        percent={Math.min(value, 30)} /* clamp for visual */
        strokeColor={isOverThreshold ? '#CF1322' : '#007A4D'}
        showInfo={false}
        size="small"
        style={{ marginBottom: 0 }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded Row Detail Panel
// ---------------------------------------------------------------------------

function ExpandedRow({ record }: { record: LabResult }) {
  const { cannabinoids, terpenes, contaminants } = record;
  const isPendingState = record.status === 'pending' || record.status === 'in_progress';

  if (isPendingState) {
    return (
      <Card size="small" style={{ margin: '8px 0', background: '#FAFAFA' }}>
        <Text type="secondary" style={{ fontStyle: 'italic' }}>
          Results are not yet available. Current status:{' '}
          <StatusBadge status={record.status} size="sm" />
        </Text>
      </Card>
    );
  }

  return (
    <Card size="small" style={{ margin: '8px 0', background: '#FAFAFA' }}>
      <Row gutter={24}>
        {/* ── Left Side: Cannabinoid & Terpene Profiles ─────────── */}
        <Col span={12}>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
            Cannabinoid Profile
          </Text>
          {cannabinoidRow('THC %', cannabinoids.thcPercent, THC_THRESHOLD)}
          {cannabinoidRow('CBD %', cannabinoids.cbdPercent, null)}
          {cannabinoidRow('CBN %', cannabinoids.cbnPercent, null)}
          {cannabinoidRow('CBG %', cannabinoids.cbgPercent, null)}

          <Divider style={{ margin: '12px 0' }} />

          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
            Terpene Profile
          </Text>
          <Descriptions
            column={1}
            size="small"
            labelStyle={{ fontWeight: 500, width: 100 }}
            contentStyle={{ fontFamily: 'monospace' }}
          >
            <Descriptions.Item label="Myrcene">{terpenes.myrcene.toFixed(2)}%</Descriptions.Item>
            <Descriptions.Item label="Limonene">{terpenes.limonene.toFixed(2)}%</Descriptions.Item>
            <Descriptions.Item label="Pinene">{terpenes.pinene.toFixed(2)}%</Descriptions.Item>
          </Descriptions>
        </Col>

        {/* ── Right Side: Contaminant Screen & Certificate ─────── */}
        <Col span={12}>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
            Contaminant Screen
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13 }}>Pesticides</Text>
              {passFail(contaminants.pesticides)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13 }}>Heavy Metals</Text>
              {passFail(contaminants.heavyMetals)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13 }}>Microbials</Text>
              {passFail(contaminants.microbials)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13 }}>Mycotoxins</Text>
              {passFail(contaminants.mycotoxins)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13 }}>Residual Solvents</Text>
              {passFail(contaminants.residualSolvents)}
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
            Certificate
          </Text>
          <Button
            type="default"
            icon={<FileDown size={14} />}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              /* TODO: Download actual CoA PDF from API */
              console.log('Download CoA for', record.sampleId);
            }}
          >
            Download CoA
          </Button>
        </Col>
      </Row>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function LabResultsPage() {
  const actionRef = useRef<ActionType>(undefined);

  const { data: labResultsResponse, isLoading, refetch } = useLabResults();
  const data = useMemo(() => (labResultsResponse as any)?.data ?? labResultsResponse ?? [], [labResultsResponse]);

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  // ── ProTable Column Definitions ────────────────────────────────────────
  const columns = useMemo<ProColumns<LabResult>[]>(
    () => [
      {
        title: 'Sample ID',
        dataIndex: 'sampleId',
        width: 180,
        render: (_, record) => (
          <TrackingId id={record.sampleId} size="sm" copyable />
        ),
      },
      {
        title: 'Harvest',
        dataIndex: 'harvestId',
        width: 180,
        render: (_, record) => (
          <TrackingId
            id={record.harvestId}
            size="sm"
            linkTo={`/harvests/${record.harvestId}`}
            copyable
          />
        ),
      },
      {
        title: 'Lab Name',
        dataIndex: 'labName',
        width: 160,
        valueType: 'text',
      },
      {
        title: 'Submitted Date',
        dataIndex: 'submittedDate',
        width: 130,
        render: (_, record) => dayjs(record.submittedDate).format('DD MMM YYYY'),
        sorter: (a, b) => dayjs(a.submittedDate).unix() - dayjs(b.submittedDate).unix(),
      },
      {
        title: 'Result Date',
        dataIndex: 'resultDate',
        width: 130,
        render: (_, record) =>
          record.resultDate ? (
            dayjs(record.resultDate).format('DD MMM YYYY')
          ) : (
            <Text type="secondary" style={{ fontStyle: 'italic' }}>Pending</Text>
          ),
        sorter: (a, b) => {
          const aVal = a.resultDate ? dayjs(a.resultDate).unix() : 0;
          const bVal = b.resultDate ? dayjs(b.resultDate).unix() : 0;
          return aVal - bVal;
        },
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 120,
        filters: [
          { text: 'Passed', value: 'passed' },
          { text: 'Failed', value: 'failed' },
          { text: 'Pending', value: 'pending' },
          { text: 'In Progress', value: 'in_progress' },
        ],
        onFilter: (value, record) => record.status === value,
        render: (_, record) => <StatusBadge status={record.status} size="sm" />,
      },
      {
        title: 'THC %',
        dataIndex: 'thcPercent',
        width: 80,
        render: (_, record) => {
          if (record.status === 'pending' || record.status === 'in_progress') {
            return <Text type="secondary">—</Text>;
          }
          const over = record.thcPercent > THC_THRESHOLD;
          return (
            <Text style={{ color: over ? '#CF1322' : undefined, fontWeight: over ? 600 : 400 }}>
              {record.thcPercent.toFixed(1)}%
            </Text>
          );
        },
        sorter: (a, b) => a.thcPercent - b.thcPercent,
      },
      {
        title: 'CBD %',
        dataIndex: 'cbdPercent',
        width: 80,
        render: (_, record) => {
          if (record.status === 'pending' || record.status === 'in_progress') {
            return <Text type="secondary">—</Text>;
          }
          return <Text>{record.cbdPercent.toFixed(1)}%</Text>;
        },
        sorter: (a, b) => a.cbdPercent - b.cbdPercent,
      },
      {
        title: 'Actions',
        valueType: 'option',
        width: 80,
        render: (_, record) => (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<Eye size={14} />}
              title="View Details"
              onClick={() => {
                /* TODO: Navigate to detail page or open drawer */
                console.log('View lab result', record.id);
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<FileDown size={14} />}
              title="Download CoA"
              disabled={record.status === 'pending' || record.status === 'in_progress'}
              onClick={() => {
                /* TODO: Download CoA PDF */
                console.log('Download CoA for', record.sampleId);
              }}
            />
          </Space>
        ),
      },
    ],
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <NctsPageContainer
      title="Lab Results"
      subTitle="THC/CBD potency and contaminant testing"
      extra={
        <Space size={12}>
          <CsvExportButton
            data={data}
            columns={CSV_COLUMNS}
            filename="lab-results-export"
            label="Export CSV"
          />
          <DataFreshness
            lastUpdated={new Date().toISOString()}
            onRefresh={() => {
              refetch();
              actionRef.current?.reload();
            }}
          />
        </Space>
      }
    >
      <ProTable<LabResult>
        actionRef={actionRef}
        columns={columns}
        dataSource={data}
        rowKey="id"
        search={{ filterType: 'light' }}
        options={{
          density: true,
          fullScreen: true,
          reload: () => {
            refetch();
            actionRef.current?.reload();
          },
          setting: true,
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} results`,
        }}
        dateFormatter="string"
        headerTitle="Test Results"
        expandable={{
          expandedRowRender: (record) => <ExpandedRow record={record} />,
          rowExpandable: () => true,
        }}
      />
    </NctsPageContainer>
  );
}
