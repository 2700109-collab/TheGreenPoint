import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions,
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Checkbox,
  Row,
  Col,
  Timeline,
  Typography,
  Space,
  message,
  Divider,
  Progress,
} from 'antd';
import {
  Shield,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Info,
  Pause,
  Plus,
  RotateCcw,
  Trash2,
  Archive,
  Mail,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  StatusBadge,
  TrackingId,
  PermitCard,
  NctsPageContainer,
  PrintButton,
} from '@ncts/ui';

dayjs.extend(relativeTime);

const { Text } = Typography;
const { TextArea } = Input;

/* ─── Mock Data ─────────────────────────────────────────────────────── */

const MOCK_PERMIT = {
  id: 'PRM-20260106-A1B2',
  permitNumber: 'PRM-20260106-A1B2',
  operatorId: 'OP-0042',
  operatorName: 'GreenLeaf Biotech (Pty) Ltd',
  type: 'cultivation' as const,
  status: 'active' as const,
  issuedDate: '2026-01-06',
  expiryDate: '2027-04-04',
  province: 'Western Cape',
  issuingAuthority: 'SAHPRA',
  complianceScore: 87,
  conditions: 'Indoor cultivation only; quarterly lab testing required',
};

type PermitStatus = 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';

interface Condition {
  key: string;
  index: number;
  description: string;
  status: 'met' | 'pending' | 'not_met';
  dueDate: string;
  evidence: string | null;
}

const MOCK_CONDITIONS: Condition[] = [
  { key: '1', index: 1, description: 'Submit monthly cultivation volume reports to SAHPRA', status: 'met', dueDate: '2026-02-28', evidence: 'RPT-2026-02-VOL.pdf' },
  { key: '2', index: 2, description: 'Maintain indoor cultivation temperature logs (18–26 °C)', status: 'met', dueDate: '2026-03-15', evidence: 'TEMP-LOG-Q1.xlsx' },
  { key: '3', index: 3, description: 'Quarterly independent lab testing of all active batches', status: 'pending', dueDate: '2026-04-01', evidence: null },
  { key: '4', index: 4, description: 'Install CCTV system covering all grow rooms with 90-day retention', status: 'not_met', dueDate: '2026-01-31', evidence: null },
  { key: '5', index: 5, description: 'Provide updated facility floor plan after expansion', status: 'pending', dueDate: '2026-05-15', evidence: null },
];

const AUDIT_EVENTS = [
  { color: 'blue' as const, label: 'Permit Application Created', date: '2025-12-01 09:14', actor: 'System' },
  { color: 'orange' as const, label: 'Application Under Review', date: '2025-12-15 11:30', actor: 'Inspector N. Mthembu' },
  { color: 'green' as const, label: 'Permit Approved & Issued', date: '2026-01-06 08:00', actor: 'Registrar T. Nkosi' },
  { color: 'blue' as const, label: 'Condition #3 Added (quarterly lab testing)', date: '2026-01-20 14:22', actor: 'Compliance Officer B. Dlamini' },
  { color: 'gray' as const, label: 'Compliance Score Updated to 87%', date: '2026-02-10 10:45', actor: 'System (auto-calc)' },
];

const CHECKLIST_ITEMS = [
  'I have reviewed the permit application in full.',
  'All supporting documents have been verified.',
  'The facility inspection report is satisfactory.',
  'Regulatory requirements for this permit type are met.',
];

const CONDITION_STATUS_MAP: Record<string, { tag: string; color: string; icon: string }> = {
  met: { tag: 'Met', color: 'green', icon: '✅' },
  pending: { tag: 'Pending', color: 'gold', icon: '⚠️' },
  not_met: { tag: 'Not Met', color: 'red', icon: '❌' },
};

const TYPE_COLORS: Record<string, string> = {
  cultivation: 'green',
  processing: 'blue',
  distribution: 'orange',
  retail: 'purple',
  research: 'cyan',
};

/* ─── Component ─────────────────────────────────────────────────────── */

export default function PermitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject'>('approve');
  const [checkedItems, setCheckedItems] = useState<boolean[]>([false, false, false, false]);
  const [rejectReason, setRejectReason] = useState('');

  // Mock: use static data keyed by ID
  const permit = { ...MOCK_PERMIT, id: id ?? MOCK_PERMIT.id };
  const status = permit.status as PermitStatus;

  const expiry = dayjs(permit.expiryDate);
  const now = dayjs();
  const daysRemaining = expiry.diff(now, 'day');
  const isExpired = daysRemaining < 0;
  const expiryLabel = isExpired
    ? `Expired ${Math.abs(daysRemaining)} days ago`
    : `${daysRemaining} days remaining`;
  const expiryColor = isExpired ? '#CF1322' : '#389E0D';

  /* ── Action buttons by status ──────────────────────────────────── */

  const openReview = (decision: 'approve' | 'reject') => {
    setReviewDecision(decision);
    setCheckedItems([false, false, false, false]);
    setRejectReason('');
    setReviewModalOpen(true);
  };

  const actionButtons: Record<PermitStatus, React.ReactNode> = {
    pending: (
      <Space>
        <Button type="primary" style={{ background: '#389E0D', borderColor: '#389E0D' }} icon={<CheckCircle size={14} />} onClick={() => openReview('approve')}>Approve</Button>
        <Button danger icon={<XCircle size={14} />} onClick={() => openReview('reject')}>Reject</Button>
        <Button icon={<Info size={14} />}>Request Info</Button>
      </Space>
    ),
    active: (
      <Space>
        <Button style={{ color: '#D48806', borderColor: '#D48806' }} icon={<Pause size={14} />}>Suspend</Button>
        <Button icon={<Plus size={14} />}>Add Condition</Button>
      </Space>
    ),
    suspended: (
      <Space>
        <Button type="primary" style={{ background: '#389E0D', borderColor: '#389E0D' }} icon={<RotateCcw size={14} />}>Reinstate</Button>
        <Button danger icon={<Trash2 size={14} />}>Revoke</Button>
      </Space>
    ),
    expired: (
      <Space>
        <Button icon={<Archive size={14} />}>Archive</Button>
        <Button icon={<Mail size={14} />}>Send Renewal Reminder</Button>
      </Space>
    ),
    revoked: null,
  };

  /* ── Conditions table columns ──────────────────────────────────── */

  const conditionColumns = [
    { title: '#', dataIndex: 'index', key: 'index', width: 50 },
    { title: 'Condition', dataIndex: 'description', key: 'description' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: string) => {
        const m = CONDITION_STATUS_MAP[s] ?? { color: 'default', icon: '—', tag: s };
        return <Tag color={m.color}>{m.icon} {m.tag}</Tag>;
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 140,
      render: (d: string) => dayjs(d).format('DD MMM YYYY'),
    },
    {
      title: 'Evidence',
      dataIndex: 'evidence',
      key: 'evidence',
      width: 180,
      render: (v: string | null) => v ? <a href="#">{v}</a> : <Text type="secondary">—</Text>,
    },
  ];

  /* ── Review modal confirm ──────────────────────────────────────── */

  const allChecked = checkedItems.every(Boolean);
  const reasonValid = reviewDecision === 'approve' || rejectReason.length >= 50;
  const canConfirm = allChecked && reasonValid;

  const handleConfirmReview = () => {
    if (!canConfirm) return;
    message.success(
      reviewDecision === 'approve'
        ? 'Permit approved successfully – status updated.'
        : 'Permit rejected – operator will be notified.',
    );
    setReviewModalOpen(false);
    // TODO: call API to update permit status
  };

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <NctsPageContainer
      title={`${' '}`}
      subTitle={' '}
      extra={
        <Space size="middle">
          <PrintButton label="Print Permit" />
          {actionButtons[status]}
        </Space>
      }
    >
      {/* Custom title area (override the plain string title) */}
      <div style={{ marginTop: -8, marginBottom: 20 }}>
        <Space align="center" size={12}>
          <Button type="text" icon={<ArrowLeft size={18} />} onClick={() => navigate('/admin/permits')} style={{ padding: 0 }} />
          <TrackingId id={permit.permitNumber} size="lg" />
          <Tag color={TYPE_COLORS[permit.type] ?? 'default'} style={{ fontSize: 13 }}>{permit.type.toUpperCase()}</Tag>
        </Space>
        <div style={{ marginTop: 6, marginLeft: 36 }}>
          <StatusBadge {...({ status: permit.status, size: 'lg' } as any)} />
        </div>
      </div>

      <Divider style={{ margin: '0 0 24px' }} />

      {/* ── Two-column layout ──────────────────────────────────────── */}
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={14}>
          <Descriptions bordered column={1} size="middle" style={{ background: '#fff' }}>
            <Descriptions.Item label="Permit Number">
              <Text copyable style={{ fontFamily: 'monospace' }}>{permit.permitNumber}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Operator">
              <a onClick={() => navigate(`/admin/operators/${permit.operatorId}`)} style={{ cursor: 'pointer' }}>
                {permit.operatorName}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color={TYPE_COLORS[permit.type] ?? 'default'}>{permit.type.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusBadge {...({ status: permit.status, size: 'md' } as any)} />
            </Descriptions.Item>
            <Descriptions.Item label="Issued Date">
              {dayjs(permit.issuedDate).format('DD MMMM YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Expiry Date">
              <Space>
                <span>{dayjs(permit.expiryDate).format('DD MMMM YYYY')}</span>
                <Text style={{ color: expiryColor, fontWeight: 600, fontSize: 12 }}>({expiryLabel})</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Province">{permit.province}</Descriptions.Item>
            <Descriptions.Item label="Issuing Authority">{permit.issuingAuthority}</Descriptions.Item>
            <Descriptions.Item label="Compliance Score">
              <Space>
                <Progress
                  percent={permit.complianceScore}
                  size="small"
                  style={{ width: 160, margin: 0 }}
                  strokeColor={permit.complianceScore >= 80 ? '#389E0D' : permit.complianceScore >= 50 ? '#D48806' : '#CF1322'}
                />
                <Text strong>{permit.complianceScore}%</Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Col>

        <Col xs={24} xl={10}>
          <PermitCard
            {...({
              permitNumber: permit.permitNumber,
              operatorName: permit.operatorName,
              licenseType: permit.type,
              type: permit.type,
              status: permit.status,
              issuedDate: permit.issuedDate,
              expiryDate: permit.expiryDate,
              conditions: permit.conditions,
              size: 'lg',
            } as any)}
          />
        </Col>
      </Row>

      {/* ── Conditions Table ───────────────────────────────────────── */}
      <Card
        title={<Space><Shield size={16} /> Conditions</Space>}
        style={{ marginTop: 24 }}
      >
        <Table
          dataSource={MOCK_CONDITIONS}
          columns={conditionColumns}
          pagination={false}
          size="middle"
          rowKey="key"
        />
      </Card>

      {/* ── Audit Timeline ─────────────────────────────────────────── */}
      <Card
        title="Audit Trail"
        style={{ marginTop: 24 }}
      >
        <Timeline
          items={AUDIT_EVENTS.map((evt) => ({
            color: evt.color,
            children: (
              <div>
                <Text strong>{evt.label}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{evt.date} — {evt.actor}</Text>
              </div>
            ),
          }))}
        />
      </Card>

      {/* ── Review Workflow Modal ──────────────────────────────────── */}
      <Modal
        title={reviewDecision === 'approve' ? 'Approve Permit' : 'Reject Permit'}
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={null}
        width={520}
      >
        <Divider style={{ margin: '8px 0 16px' }} />

        <Text strong style={{ display: 'block', marginBottom: 12 }}>Confirmation Checklist</Text>
        {CHECKLIST_ITEMS.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            <Checkbox
              checked={checkedItems[idx]}
              onChange={(e) => {
                const next = [...checkedItems];
                next[idx] = e.target.checked;
                setCheckedItems(next);
              }}
            >
              {item}
            </Checkbox>
          </div>
        ))}

        <Divider />

        <Text strong>Decision: </Text>
        <Tag color={reviewDecision === 'approve' ? 'green' : 'red'} style={{ fontSize: 13 }}>
          {reviewDecision === 'approve' ? 'APPROVE' : 'REJECT'}
        </Tag>

        {reviewDecision === 'reject' && (
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Reason for Rejection (min 50 chars)</Text>
            <TextArea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a detailed reason for rejection…"
              showCount
              maxLength={500}
              status={rejectReason.length > 0 && rejectReason.length < 50 ? 'error' : undefined}
            />
            {rejectReason.length > 0 && rejectReason.length < 50 && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {50 - rejectReason.length} more characters required
              </Text>
            )}
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => setReviewModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              danger={reviewDecision === 'reject'}
              disabled={!canConfirm}
              onClick={handleConfirmReview}
              style={reviewDecision === 'approve' ? { background: '#389E0D', borderColor: '#389E0D' } : undefined}
            >
              Confirm Decision
            </Button>
          </Space>
        </div>
      </Modal>
    </NctsPageContainer>
  );
}
