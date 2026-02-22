import {
  Card,
  Descriptions,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Avatar,
  Statistic,
  List,
} from 'antd';
import { Pencil, Building2, Warehouse, FlaskConical } from 'lucide-react';
import { NctsPageContainer, StatusBadge, TrackingId } from '@ncts/ui';

const { Title, Text } = Typography;

// ---------------------------------------------------------------------------
// Mock Data — TODO: Replace with real API hooks
// (useOperatorProfile, useOperatorFacilities, useOperatorStats)
// ---------------------------------------------------------------------------

const MOCK_OPERATOR = {
  companyName: 'GreenPoint Cannabis (Pty) Ltd',
  registrationNumber: '2024/123456/07',
  licenseType: 'Cultivation & Processing',
  licenseNumber: 'LIC-20250106-GP01',
  contactPerson: 'John van der Merwe',
  email: 'john@greenpoint.co.za',
  phone: '+27 11 555 0123',
  address: '42 Cannabis Drive, Stellenbosch, Western Cape, 7600',
  memberSince: 'Jan 2025',
};

const MOCK_FACILITIES = [
  { id: '1', name: 'Stellenbosch Cultivation Facility', type: 'Cultivation', status: 'active' as const },
  { id: '2', name: 'Cape Town Processing Lab', type: 'Processing', status: 'active' as const },
  { id: '3', name: 'Paarl Drying Warehouse', type: 'Storage', status: 'pending' as const },
];

const MOCK_MONTHLY_STATS = {
  plantsRegistered: 24,
  harvests: 8,
  transfers: 12,
  salesValue: 142_500,
};

const FACILITY_ICON_MAP: Record<string, React.ReactNode> = {
  Cultivation: <Building2 size={16} />,
  Processing: <FlaskConical size={16} />,
  Storage: <Warehouse size={16} />,
};

const FACILITY_TAG_COLOR: Record<string, string> = {
  Cultivation: 'green',
  Processing: 'blue',
  Storage: 'orange',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  return (
    <NctsPageContainer
      title="Operator Profile"
      extra={
        <Button type="primary" icon={<Pencil size={14} />}>
          Edit Profile
        </Button>
      }
    >
      <Row gutter={[24, 24]}>
        {/* ---- Left Column ---- */}
        <Col xs={24} xl={16}>
          <Card title="Operator Information" style={{ marginBottom: 24 }}>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Company Name">
                {MOCK_OPERATOR.companyName}
              </Descriptions.Item>
              <Descriptions.Item label="Registration Number">
                {MOCK_OPERATOR.registrationNumber}
              </Descriptions.Item>
              <Descriptions.Item label="License Type">
                <Tag color="green">{MOCK_OPERATOR.licenseType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="License Number">
                <TrackingId id={MOCK_OPERATOR.licenseNumber} size="sm" />
              </Descriptions.Item>
              <Descriptions.Item label="Contact Person">
                {MOCK_OPERATOR.contactPerson}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {MOCK_OPERATOR.email}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {MOCK_OPERATOR.phone}
              </Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>
                {MOCK_OPERATOR.address}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            title="Facilities"
            extra={<Button type="link">Manage Facilities</Button>}
          >
            <List
              dataSource={MOCK_FACILITIES}
              renderItem={(facility) => (
                <List.Item
                  key={facility.id}
                  actions={[<StatusBadge status={facility.status} size="sm" />]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{ backgroundColor: '#f0f5ff' }}
                        icon={FACILITY_ICON_MAP[facility.type] ?? <Building2 size={16} />}
                      />
                    }
                    title={facility.name}
                    description={
                      <Tag color={FACILITY_TAG_COLOR[facility.type] ?? 'default'}>
                        {facility.type}
                      </Tag>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* ---- Right Column ---- */}
        <Col xs={24} xl={8}>
          <Card style={{ textAlign: 'center', marginBottom: 24 }}>
            <Avatar
              size={80}
              style={{
                backgroundColor: '#007A4D',
                fontSize: 32,
                marginBottom: 16,
              }}
            >
              GP
            </Avatar>
            <Title level={4} style={{ marginBottom: 4 }}>
              {MOCK_OPERATOR.companyName}
            </Title>
            <div style={{ marginBottom: 8 }}>
              <StatusBadge status="active" size="sm" />
            </div>
            <Text type="secondary">Member since {MOCK_OPERATOR.memberSince}</Text>
          </Card>

          <Card title="This Month">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="Plants Registered" value={MOCK_MONTHLY_STATS.plantsRegistered} />
              </Col>
              <Col span={12}>
                <Statistic title="Harvests" value={MOCK_MONTHLY_STATS.harvests} />
              </Col>
              <Col span={12}>
                <Statistic title="Transfers" value={MOCK_MONTHLY_STATS.transfers} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Sales"
                  value={MOCK_MONTHLY_STATS.salesValue}
                  prefix="R"
                  precision={0}
                  groupSeparator=","
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </NctsPageContainer>
  );
}
