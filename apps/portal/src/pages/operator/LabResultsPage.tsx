/**
 * LabResultsPage — THC/CBD potency & contaminant testing with ProTable and expandable detail panels.
 * Per FrontEnd.md §3.7.
 */

import { useMemo, useRef } from 'react';
import { Card, Row, Col, Tag, Button, Descriptions, Progress, Typography, Space, Divider } from 'antd';
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
// Mock Data — TODO: Replace with API hooks (e.g. useLabResults from @ncts/api-client)
// ---------------------------------------------------------------------------

const MOCK_LAB_RESULTS: LabResult[] = [
  {
    id: '1',
    sampleId: 'LAB-20260115-001',
    harvestId: 'HRV-20260110-AAA',
    labName: 'CannaChem Labs',
    submittedDate: '2026-01-15',
    resultDate: '2026-01-20',
    status: 'passed',
    thcPercent: 18.4,
    cbdPercent: 0.6,
    cannabinoids: { thcPercent: 18.4, cbdPercent: 0.6, cbnPercent: 0.2, cbgPercent: 0.8 },
    terpenes: { myrcene: 0.45, limonene: 0.32, pinene: 0.18 },
    contaminants: { pesticides: true, heavyMetals: true, microbials: true, mycotoxins: true, residualSolvents: true },
  },
  {
    id: '2',
    sampleId: 'LAB-20260118-002',
    harvestId: 'HRV-20260112-BBB',
    labName: 'GreenTest SA',
    submittedDate: '2026-01-18',
    resultDate: '2026-01-24',
    status: 'failed',
    thcPercent: 22.7,
    cbdPercent: 0.3,
    cannabinoids: { thcPercent: 22.7, cbdPercent: 0.3, cbnPercent: 0.1, cbgPercent: 0.4 },
    terpenes: { myrcene: 0.62, limonene: 0.15, pinene: 0.09 },
    contaminants: { pesticides: false, heavyMetals: true, microbials: true, mycotoxins: false, residualSolvents: true },
  },
  {
    id: '3',
    sampleId: 'LAB-20260125-003',
    harvestId: 'HRV-20260120-CCC',
    labName: 'CannaChem Labs',
    submittedDate: '2026-01-25',
    resultDate: null,
    status: 'pending',
    thcPercent: 0,
    cbdPercent: 0,
    cannabinoids: { thcPercent: 0, cbdPercent: 0, cbnPercent: 0, cbgPercent: 0 },
    terpenes: { myrcene: 0, limonene: 0, pinene: 0 },
    contaminants: { pesticides: false, heavyMetals: false, microbials: false, mycotoxins: false, residualSolvents: false },
  },
  {
    id: '4',
    sampleId: 'LAB-20260130-004',
    harvestId: 'HRV-20260128-DDD',
    labName: 'PhytoLab Cape Town',
    submittedDate: '2026-01-30',
    resultDate: null,
    status: 'in_progress',
    thcPercent: 0,
    cbdPercent: 0,
    cannabinoids: { thcPercent: 0, cbdPercent: 0, cbnPercent: 0, cbgPercent: 0 },
    terpenes: { myrcene: 0, limonene: 0, pinene: 0 },
    contaminants: { pesticides: false, heavyMetals: false, microbials: false, mycotoxins: false, residualSolvents: false },
  },
  {
    id: '5',
    sampleId: 'LAB-20260202-005',
    harvestId: 'HRV-20260201-EEE',
    labName: 'GreenTest SA',
    submittedDate: '2026-02-02',
    resultDate: '2026-02-08',
    status: 'passed',
    thcPercent: 15.2,
    cbdPercent: 7.8,
    cannabinoids: { thcPercent: 15.2, cbdPercent: 7.8, cbnPercent: 0.5, cbgPercent: 1.1 },
    terpenes: { myrcene: 0.38, limonene: 0.54, pinene: 0.27 },
    contaminants: { pesticides: true, heavyMetals: true, microbials: true, mycotoxins: true, residualSolvents: true },
  },
  {
    id: '6',
    sampleId: 'LAB-20260210-006',
    harvestId: 'HRV-20260208-FFF',
    labName: 'PhytoLab Cape Town',
    submittedDate: '2026-02-10',
    resultDate: '2026-02-15',
    status: 'passed',
    thcPercent: 19.8,
    cbdPercent: 1.2,
    cannabinoids: { thcPercent: 19.8, cbdPercent: 1.2, cbnPercent: 0.3, cbgPercent: 0.6 },
    terpenes: { myrcene: 0.51, limonene: 0.28, pinene: 0.14 },
    contaminants: { pesticides: true, heavyMetals: true, microbials: true, mycotoxins: true, residualSolvents: true },
  },
  {
    id: '7',
    sampleId: 'LAB-20260215-007',
    harvestId: 'HRV-20260213-GGG',
    labName: 'CannaChem Labs',
    submittedDate: '2026-02-15',
    resultDate: '2026-02-19',
    status: 'failed',
    thcPercent: 24.1,
    cbdPercent: 0.2,
    cannabinoids: { thcPercent: 24.1, cbdPercent: 0.2, cbnPercent: 0.1, cbgPercent: 0.3 },
    terpenes: { myrcene: 0.71, limonene: 0.11, pinene: 0.05 },
    contaminants: { pesticides: true, heavyMetals: false, microbials: true, mycotoxins: true, residualSolvents: false },
  },
  {
    id: '8',
    sampleId: 'LAB-20260220-008',
    harvestId: 'HRV-20260218-HHH',
    labName: 'GreenTest SA',
    submittedDate: '2026-02-20',
    resultDate: null,
    status: 'in_progress',
    thcPercent: 0,
    cbdPercent: 0,
    cannabinoids: { thcPercent: 0, cbdPercent: 0, cbnPercent: 0, cbgPercent: 0 },
    terpenes: { myrcene: 0, limonene: 0, pinene: 0 },
    contaminants: { pesticides: false, heavyMetals: false, microbials: false, mycotoxins: false, residualSolvents: false },
  },
];

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

  // TODO: Replace with real data-fetching hook
  const data = useMemo(() => MOCK_LAB_RESULTS, []);

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
              /* TODO: invalidate react-query cache */
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
            /* TODO: re-fetch from API */
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
