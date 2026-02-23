/**
 * InspectionDetailPage — Inspection detail, checklist recording & assessment.
 * Per FrontEnd.md §4.9.3.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Descriptions,
  Divider,
  Input,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  ArrowLeft,
  Edit,
  Play,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { StatusBadge, TrackingId, NctsPageContainer, DataFreshness } from '@ncts/ui';
import { useInspection } from '@ncts/api-client';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const { TextArea } = Input;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InspectionType = 'Routine' | 'Complaint' | 'Follow-up' | 'Random';
type InspectionStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue';
type CheckOutcome = 'Pass' | 'Fail' | 'N/A';
type Severity = 'None' | 'Minor' | 'Major' | 'Critical';

interface ChecklistItem {
  key: string;
  name: string;
  checked: boolean;
  outcome: CheckOutcome;
  findings: string;
  severity: Severity;
  remediationRequired: boolean;
  remediationDeadline: string | null;
}

// ---------------------------------------------------------------------------
// Colour maps
// ---------------------------------------------------------------------------

const TYPE_COLOR: Record<InspectionType, string> = {
  Routine: 'blue',
  Complaint: 'red',
  'Follow-up': 'orange',
  Random: 'purple',
};

const PRIORITY_COLOR: Record<string, string> = {
  Low: 'default',
  Medium: 'gold',
  High: 'orange',
  Critical: 'red',
};

// ---------------------------------------------------------------------------
// Mock Data — TODO: Replace with API hooks (GET /inspections/:id)
// ---------------------------------------------------------------------------

const MOCK_INSPECTION = {
  id: 'INS-001',
  facilityId: 'FAC-01',
  facilityName: 'GreenLeaf Cultivation',
  type: 'Routine' as InspectionType,
  status: 'Completed' as InspectionStatus,
  priority: 'Medium',
  scheduledDate: '2026-02-03',
  inspector: 'N. Mthembu',
  estimatedDuration: 3,
};

const MOCK_CHECKLIST: ChecklistItem[] = [
  { key: '1', name: 'Cultivation area cleanliness & organisation', checked: true, outcome: 'Pass', findings: 'All areas clean and well-organised. No debris found.', severity: 'None', remediationRequired: false, remediationDeadline: null },
  { key: '2', name: 'Security systems & access control', checked: true, outcome: 'Pass', findings: 'CCTV operational, access logs up to date.', severity: 'None', remediationRequired: false, remediationDeadline: null },
  { key: '3', name: 'Record-keeping & documentation', checked: true, outcome: 'Fail', findings: 'Missing batch records for December 2025. Several log entries incomplete.', severity: 'Major', remediationRequired: true, remediationDeadline: '2026-03-15' },
  { key: '4', name: 'Waste disposal procedures', checked: true, outcome: 'Pass', findings: 'Waste logs accurate. Disposal contractor verified.', severity: 'None', remediationRequired: false, remediationDeadline: null },
  { key: '5', name: 'Plant tagging & traceability', checked: true, outcome: 'Pass', findings: 'All plants tagged with valid QR codes.', severity: 'None', remediationRequired: false, remediationDeadline: null },
  { key: '6', name: 'Storage conditions & inventory', checked: true, outcome: 'Fail', findings: 'Temperature logger in cold room #2 not calibrated since Nov 2025.', severity: 'Minor', remediationRequired: true, remediationDeadline: '2026-03-01' },
  { key: '7', name: 'Staff credentials & training records', checked: true, outcome: 'Pass', findings: 'All credentials valid. Training records complete.', severity: 'None', remediationRequired: false, remediationDeadline: null },
];

// ---------------------------------------------------------------------------
// Timeline events — TODO: fetch from audit log API
// ---------------------------------------------------------------------------

const TIMELINE_EVENTS = [
  { color: 'blue' as const, label: 'Inspection Created', date: '2026-01-15 09:00', actor: 'System' },
  { color: 'cyan' as const, label: 'Inspector Assigned — N. Mthembu', date: '2026-01-15 09:05', actor: 'Admin T. Nkosi' },
  { color: 'green' as const, label: 'Inspection Started', date: '2026-02-03 08:30', actor: 'N. Mthembu' },
  { color: 'green' as const, label: 'Inspection Completed', date: '2026-02-03 11:45', actor: 'N. Mthembu' },
  { color: 'gray' as const, label: 'Report Generated', date: '2026-02-03 12:00', actor: 'System' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inspectionResponse, isLoading } = useInspection(id ?? '');

  // Map API data or fall back to mock
  const rawInsp = inspectionResponse?.data ?? inspectionResponse;
  const inspection = rawInsp
    ? {
        id: (rawInsp as any).id ?? id ?? MOCK_INSPECTION.id,
        facilityId: (rawInsp as any).facilityId ?? MOCK_INSPECTION.facilityId,
        facilityName: (rawInsp as any).facilityName ?? (rawInsp as any).facility?.name ?? MOCK_INSPECTION.facilityName,
        type: ((rawInsp as any).type ?? MOCK_INSPECTION.type) as InspectionType,
        status: ((rawInsp as any).status ?? MOCK_INSPECTION.status) as InspectionStatus,
        priority: (rawInsp as any).priority ?? MOCK_INSPECTION.priority,
        scheduledDate: (rawInsp as any).scheduledDate ?? MOCK_INSPECTION.scheduledDate,
        inspector: (rawInsp as any).inspector ?? (rawInsp as any).inspectorName ?? MOCK_INSPECTION.inspector,
        estimatedDuration: (rawInsp as any).estimatedDuration ?? MOCK_INSPECTION.estimatedDuration,
      }
    : { ...MOCK_INSPECTION, id: id ?? MOCK_INSPECTION.id };
  const status = inspection.status;

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  // ── Checklist state ─────────────────────────────────────────────
  const [checklist, setChecklist] = useState<ChecklistItem[]>(MOCK_CHECKLIST);
  const [overallOutcome, setOverallOutcome] = useState<string>('Conditional');
  const [summaryText, setSummaryText] = useState(
    'Facility generally compliant. Two findings require remediation — record-keeping gaps and cold room sensor calibration.',
  );
  const [followUpRequired, setFollowUpRequired] = useState(true);
  const [followUpDate, setFollowUpDate] = useState<string>('2026-04-03');

  const updateChecklistItem = (key: string, patch: Partial<ChecklistItem>) => {
    setChecklist((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  // ── Action buttons based on status ──────────────────────────────
  const actionButtons = () => {
    switch (status) {
      case 'Scheduled':
        return (
          <Button type="primary" icon={<Play size={14} />} onClick={() => message.info('TODO: Start inspection')}>
            Start Inspection
          </Button>
        );
      case 'In Progress':
        return (
          <Button type="primary" style={{ background: '#389E0D', borderColor: '#389E0D' }} icon={<CheckCircle size={14} />} onClick={() => message.info('TODO: Complete inspection')}>
            Complete Inspection
          </Button>
        );
      case 'Completed':
        return (
          <Button icon={<FileText size={14} />} onClick={() => message.info('TODO: Download report')}>
            Download Report
          </Button>
        );
      default:
        return null;
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <NctsPageContainer
      title={`Inspection #${inspection.id}`}
      subTitle={
        (
          <Space>
            <StatusBadge {...({ status: status.toLowerCase().replace(/ /g, '_'), size: 'md' } as any)} />
            <Tag color={TYPE_COLOR[inspection.type]}>{inspection.type}</Tag>
          </Space>
        ) as unknown as string
      }
      extra={
        <Space>
          <DataFreshness {...({ timestamp: dayjs().subtract(2, 'minute').toISOString() } as any)} />
          <Button icon={<Edit size={14} />} onClick={() => message.info('TODO: Edit inspection')}>Edit</Button>
          {actionButtons()}
        </Space>
      }
    >
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeft size={16} />} onClick={() => navigate('/admin/compliance/inspections')} style={{ padding: 0, fontWeight: 500 }}>
          Back to Inspections
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        {/* ── Left Column ──────────────────────────────────────────── */}
        <Col xs={24} xl={16}>
          {/* Header Info */}
          <Card style={{ marginBottom: 24 }}>
            <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
              <Descriptions.Item label="Inspection ID">
                <TrackingId {...({ id: inspection.id, size: 'md' } as any)} />
              </Descriptions.Item>
              <Descriptions.Item label="Facility">
                <a onClick={() => navigate('/admin/facilities')} style={{ cursor: 'pointer' }}>
                  {inspection.facilityName}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="Scheduled Date">
                {dayjs(inspection.scheduledDate).format('DD MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Inspector">{inspection.inspector}</Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color={TYPE_COLOR[inspection.type]}>{inspection.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={PRIORITY_COLOR[inspection.priority]}>{inspection.priority}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Estimated Duration">{inspection.estimatedDuration} hours</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Checklist Recording */}
          <Card
            title={
              <Space>
                <span>Checklist Recording</span>
                <Tag>{checklist.filter((c) => c.checked).length}/{checklist.length} completed</Tag>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Collapse
              accordion
              defaultActiveKey={['3']}
              items={checklist.map((item) => ({
                key: item.key,
                label: (
                  <Space>
                    <Checkbox
                      checked={item.checked}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateChecklistItem(item.key, { checked: e.target.checked })}
                    />
                    <Text strong={item.outcome === 'Fail'} style={{ color: item.outcome === 'Fail' ? '#ff4d4f' : undefined }}>
                      {item.name}
                    </Text>
                    <Select
                      size="small"
                      value={item.outcome}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(v) => updateChecklistItem(item.key, { outcome: v as CheckOutcome })}
                      style={{ width: 90 }}
                      options={[
                        { label: 'Pass', value: 'Pass' },
                        { label: 'Fail', value: 'Fail' },
                        { label: 'N/A', value: 'N/A' },
                      ]}
                    />
                  </Space>
                ),
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>Findings</Text>
                      <TextArea
                        rows={2}
                        value={item.findings}
                        onChange={(e) => updateChecklistItem(item.key, { findings: e.target.value })}
                        placeholder="Enter findings…"
                      />
                    </div>

                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>Evidence Upload</Text>
                      {/* TODO: integrate file upload component */}
                      <Button size="small" disabled>Upload Evidence (coming soon)</Button>
                    </div>

                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>Severity</Text>
                      <Radio.Group
                        value={item.severity}
                        onChange={(e) => updateChecklistItem(item.key, { severity: e.target.value as Severity })}
                      >
                        <Radio value="None">None</Radio>
                        <Radio value="Minor">Minor</Radio>
                        <Radio value="Major">Major</Radio>
                        <Radio value="Critical">Critical</Radio>
                      </Radio.Group>
                    </div>

                    <div>
                      <Space>
                        <Text strong>Remediation Required</Text>
                        <Switch
                          checked={item.remediationRequired}
                          onChange={(v) => updateChecklistItem(item.key, { remediationRequired: v })}
                        />
                      </Space>
                      {item.remediationRequired && (
                        <div style={{ marginTop: 8 }}>
                          <Text style={{ display: 'block', marginBottom: 4 }}>Remediation Deadline</Text>
                          <DatePicker
                            value={item.remediationDeadline ? dayjs(item.remediationDeadline) : null}
                            onChange={(_date, dateString) => updateChecklistItem(item.key, { remediationDeadline: dateString as string })}
                            style={{ width: 200 }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>

          {/* Overall Assessment */}
          <Card title="Overall Assessment">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <Title level={5} style={{ marginBottom: 8 }}>Outcome</Title>
                <Radio.Group value={overallOutcome} onChange={(e) => setOverallOutcome(e.target.value as string)}>
                  <Radio.Button value="Pass">Pass</Radio.Button>
                  <Radio.Button value="Conditional">Conditional Pass</Radio.Button>
                  <Radio.Button value="Fail">Fail</Radio.Button>
                </Radio.Group>
              </div>

              <div>
                <Title level={5} style={{ marginBottom: 8 }}>Summary</Title>
                <TextArea
                  rows={4}
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="Enter overall inspection summary…"
                  showCount
                  maxLength={1000}
                />
              </div>

              <div>
                <Space size={16}>
                  <Text strong>Follow-up Required</Text>
                  <Switch checked={followUpRequired} onChange={setFollowUpRequired} />
                  {followUpRequired && (
                    <DatePicker
                      value={followUpDate ? dayjs(followUpDate) : null}
                      onChange={(_date, dateString) => setFollowUpDate(dateString as string)}
                      placeholder="Follow-up date"
                    />
                  )}
                </Space>
              </div>

              <Divider style={{ margin: '4px 0' }} />

              <div style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => {
                    // TODO: POST /inspections/:id/assessment
                    message.success('Assessment submitted successfully!');
                  }}
                >
                  Submit Assessment
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* ── Right Sidebar ────────────────────────────────────────── */}
        <Col xs={24} xl={8}>
          <Card title="Inspection Timeline">
            <Timeline
              items={TIMELINE_EVENTS.map((evt) => ({
                color: evt.color,
                children: (
                  <div>
                    <Text strong>{evt.label}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {evt.date} — {evt.actor}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </NctsPageContainer>
  );
}
