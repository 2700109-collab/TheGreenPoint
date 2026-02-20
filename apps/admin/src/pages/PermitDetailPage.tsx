import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Descriptions,
  Tag,
  Card,
  Button,
  Space,
  Spin,
  Alert,
  Select,
  Modal,
  message,
  Timeline,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { usePermits, useUpdatePermitStatus } from '@ncts/api-client';
import type { PermitStatus } from '@ncts/shared-types';
import { useState } from 'react';

const { Title, Text } = Typography;

const permitTypeLabels: Record<string, string> = {
  sahpra_22a: 'SAHPRA §22A Research Permit',
  sahpra_22c: 'SAHPRA §22C Manufacturing',
  dalrrd_hemp: 'DALRRD Industrial Hemp',
  dtic_processing: 'DTIC Processing Licence',
};

const statusColors: Record<string, string> = {
  active: 'green',
  expired: 'red',
  suspended: 'orange',
  pending: 'gold',
  revoked: 'volcano',
};

const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircleOutlined />,
  expired: <CloseCircleOutlined />,
  suspended: <ExclamationCircleOutlined />,
  pending: <ClockCircleOutlined />,
  revoked: <CloseCircleOutlined />,
};

const statusOptions: { value: PermitStatus; label: string }[] = [
  { value: 'active' as PermitStatus, label: 'Active' },
  { value: 'pending' as PermitStatus, label: 'Pending' },
  { value: 'suspended' as PermitStatus, label: 'Suspended' },
  { value: 'expired' as PermitStatus, label: 'Expired' },
  { value: 'revoked' as PermitStatus, label: 'Revoked' },
];

export default function PermitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [newStatus, setNewStatus] = useState<PermitStatus | undefined>();
  const updateStatus = useUpdatePermitStatus();

  // We load all permits and find the matching one (no dedicated usePermit(id) hook yet)
  const { data, isLoading, error } = usePermits({ page: 1, limit: 200 });
  const permit = data?.data?.find((p) => p.id === id);

  const handleStatusChange = () => {
    if (!newStatus || !id) return;
    Modal.confirm({
      title: 'Update Permit Status',
      content: `Change permit status to "${newStatus.toUpperCase()}"? This action will be recorded in the audit trail.`,
      onOk: async () => {
        try {
          await updateStatus.mutateAsync({ id, status: newStatus });
          message.success(`Permit status updated to ${newStatus}`);
          setNewStatus(undefined);
        } catch (err: any) {
          message.error(err?.message ?? 'Failed to update status');
        }
      },
    });
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (error) return <Alert type="error" message="Failed to load permit" showIcon />;
  if (!permit) return <Alert type="warning" message="Permit not found" showIcon />;

  const daysUntilExpiry = Math.ceil(
    (new Date(permit.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/permits')}>
          Back to Permits
        </Button>
      </Space>

      <Title level={3}>
        Permit {permit.permitNumber}
        <Tag color={statusColors[permit.status]} style={{ marginLeft: 12, verticalAlign: 'middle', fontSize: 14 }}>
          {statusIcons[permit.status]} {permit.status.toUpperCase()}
        </Tag>
      </Title>

      {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
        <Alert
          type="warning"
          message={`This permit expires in ${daysUntilExpiry} days`}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {daysUntilExpiry <= 0 && (
        <Alert
          type="error"
          message="This permit has expired"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title="Permit Information" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Permit Number">
            <Text copyable style={{ fontFamily: 'monospace' }}>{permit.permitNumber}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Permit Type">
            {permitTypeLabels[permit.permitType] || permit.permitType}
          </Descriptions.Item>
          <Descriptions.Item label="Issuing Authority">
            {permit.issuingAuthority}
          </Descriptions.Item>
          <Descriptions.Item label="Facility ID">
            <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>{permit.facilityId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Issue Date">
            {new Date(permit.issueDate).toLocaleDateString('en-ZA', { dateStyle: 'long' })}
          </Descriptions.Item>
          <Descriptions.Item label="Expiry Date">
            <span style={{ color: daysUntilExpiry <= 30 ? '#ff4d4f' : undefined, fontWeight: daysUntilExpiry <= 30 ? 600 : 400 }}>
              {new Date(permit.expiryDate).toLocaleDateString('en-ZA', { dateStyle: 'long' })}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusColors[permit.status]}>{permit.status.toUpperCase()}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Conditions">
            {permit.conditions || <Text type="secondary">None specified</Text>}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Change Permit Status" style={{ marginBottom: 24 }}>
        <Space>
          <Select
            placeholder="Select new status"
            style={{ width: 200 }}
            value={newStatus}
            onChange={setNewStatus}
            options={statusOptions.filter((o) => o.value !== permit.status)}
          />
          <Button
            type="primary"
            danger={newStatus === 'revoked' || newStatus === 'suspended'}
            onClick={handleStatusChange}
            disabled={!newStatus}
            loading={updateStatus.isPending}
          >
            Update Status
          </Button>
        </Space>
      </Card>

      <Card title="Audit Timeline">
        <Timeline
          items={[
            {
              color: 'green',
              children: (
                <>
                  <Text strong>Permit Issued</Text>
                  <br />
                  <Text type="secondary">{new Date(permit.issueDate).toLocaleDateString('en-ZA')}</Text>
                </>
              ),
            },
            {
              color: statusColors[permit.status] === 'green' ? 'green' : 'red',
              children: (
                <>
                  <Text strong>Current Status: {permit.status.toUpperCase()}</Text>
                  <br />
                  <Text type="secondary">Last known state</Text>
                </>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
