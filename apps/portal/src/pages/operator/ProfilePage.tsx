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
  Spin,
} from 'antd';
import { Pencil, Building2, Warehouse, FlaskConical } from 'lucide-react';
import { NctsPageContainer, StatusBadge, TrackingId } from '@ncts/ui';
import { useCurrentUser, useFacilities } from '@ncts/api-client';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

// ---------------------------------------------------------------------------
// Mock Data — monthly stats don't have an endpoint yet
// ---------------------------------------------------------------------------

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
  const { user } = useAuth();
  const { data: currentUserData, isLoading: isUserLoading } = useCurrentUser();
  const { data: facilitiesResponse, isLoading: isFacilitiesLoading } = useFacilities();

  const profileUser = currentUserData as any;
  const facilities = ((facilitiesResponse as any)?.data ?? facilitiesResponse ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    type: f.type ? f.type.charAt(0).toUpperCase() + f.type.slice(1) : 'Other',
    status: f.status ?? 'active',
  }));

  const operator = {
    companyName: profileUser?.companyName ?? user?.firstName + ' ' + user?.lastName ?? '—',
    registrationNumber: profileUser?.registrationNumber ?? '—',
    licenseType: profileUser?.licenseType ?? '—',
    licenseNumber: profileUser?.licenseNumber ?? '—',
    contactPerson: profileUser ? `${profileUser.firstName} ${profileUser.lastName}` : (user ? `${user.firstName} ${user.lastName}` : '—'),
    email: profileUser?.email ?? user?.email ?? '—',
    phone: profileUser?.phone ?? '—',
    address: profileUser?.address ?? '—',
    memberSince: profileUser?.lastLoginAt ? new Date(profileUser.lastLoginAt).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }) : '—',
  };

  const isLoading = isUserLoading || isFacilitiesLoading;
  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

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
                {operator.companyName}
              </Descriptions.Item>
              <Descriptions.Item label="Registration Number">
                {operator.registrationNumber}
              </Descriptions.Item>
              <Descriptions.Item label="License Type">
                <Tag color="green">{operator.licenseType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="License Number">
                <TrackingId id={operator.licenseNumber} size="sm" />
              </Descriptions.Item>
              <Descriptions.Item label="Contact Person">
                {operator.contactPerson}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {operator.email}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {operator.phone}
              </Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>
                {operator.address}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            title="Facilities"
            extra={<Button type="link">Manage Facilities</Button>}
          >
            <List
              dataSource={facilities}
              renderItem={(facility: any) => (
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
              {operator.companyName}
            </Title>
            <div style={{ marginBottom: 8 }}>
              <StatusBadge status="active" size="sm" />
            </div>
            <Text type="secondary">Member since {operator.memberSince}</Text>
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
