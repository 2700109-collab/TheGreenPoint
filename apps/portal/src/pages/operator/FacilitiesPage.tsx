import { useState } from 'react';
import {
  Row,
  Col,
  Card,
  Tag,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
  message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, MapPin, Eye, Pencil, Navigation } from 'lucide-react';
import {
  NctsPageContainer,
  StatusBadge,
  TrackingId,
  EntityEmptyState,
  SkeletonPage,
} from '@ncts/ui';
import type { FacilityStatus } from '@ncts/ui';

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FacilityType = 'cultivation' | 'processing' | 'distribution' | 'retail';

interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  province: string;
  city: string;
  streetAddress: string;
  gpsLat: number;
  gpsLng: number;
  activePlants: number;
  areaSqm: number;
  licenseNumber?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<FacilityType, string> = {
  cultivation: '#007A4D',
  processing: '#1890FF',
  distribution: '#FA8C16',
  retail: '#722ED1',
};

const TYPE_TAG_COLORS: Record<FacilityType, string> = {
  cultivation: 'green',
  processing: 'blue',
  distribution: 'orange',
  retail: 'purple',
};

const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

// ---------------------------------------------------------------------------
// Mock data — TODO: replace with useFacilities() API hook
// ---------------------------------------------------------------------------

const MOCK_FACILITIES: Facility[] = [
  {
    id: 'fac-001',
    name: 'Stellenbosch Cultivation Centre',
    type: 'cultivation',
    status: 'active',
    province: 'Western Cape',
    city: 'Stellenbosch',
    streetAddress: '24 Dorp Street',
    gpsLat: -33.9346,
    gpsLng: 18.8602,
    activePlants: 342,
    areaSqm: 2400,
    licenseNumber: 'FAC-20250115-STL',
    description: 'Primary indoor cultivation facility with 6 grow rooms.',
  },
  {
    id: 'fac-002',
    name: 'Midrand Processing Lab',
    type: 'processing',
    status: 'active',
    province: 'Gauteng',
    city: 'Midrand',
    streetAddress: '88 Lever Road, Halfway House',
    gpsLat: -25.9886,
    gpsLng: 28.1269,
    activePlants: 0,
    areaSqm: 850,
    licenseNumber: 'FAC-20250220-MID',
  },
  {
    id: 'fac-003',
    name: 'Durban Distribution Hub',
    type: 'distribution',
    status: 'inactive',
    province: 'KwaZulu-Natal',
    city: 'Durban',
    streetAddress: '12 Point Waterfront Drive',
    gpsLat: -29.8587,
    gpsLng: 31.0218,
    activePlants: 0,
    areaSqm: 1200,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FacilitiesPage() {
  // TODO: replace with API hook — const { data, isLoading } = useFacilities();
  const [isLoading] = useState(false);
  const facilities = MOCK_FACILITIES;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const openAdd = () => {
    setEditingFacility(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (facility: Facility) => {
    setEditingFacility(facility);
    form.setFieldsValue({
      name: facility.name,
      type: facility.type,
      province: facility.province,
      city: facility.city,
      streetAddress: facility.streetAddress,
      gpsLat: facility.gpsLat,
      gpsLng: facility.gpsLng,
      areaSqm: facility.areaSqm,
      licenseNumber: facility.licenseNumber,
      description: facility.description,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // TODO: API call — editingFacility ? updateFacility(editingFacility.id, values) : createFacility(values)
      console.log(editingFacility ? 'Update facility' : 'Create facility', values);
      message.success(editingFacility ? 'Facility updated' : 'Facility added');
      setDrawerOpen(false);
      form.resetFields();
    } catch {
      // validation errors shown inline
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      message.warning('Geolocation not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setFieldsValue({ gpsLat: +pos.coords.latitude.toFixed(6), gpsLng: +pos.coords.longitude.toFixed(6) });
      },
      () => message.error('Unable to retrieve location'),
    );
  };

  // Loading state
  if (isLoading) return <SkeletonPage variant="table" />;

  // Empty state
  if (!facilities.length) {
    return (
      <NctsPageContainer title="Facilities" subTitle="Manage your cultivation and processing facilities">
        <EntityEmptyState
          icon={<Building2 size={48} />}
          heading="No facilities yet"
          description="Add your first facility to get started"
          action={
            <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>
              Add Facility
            </Button>
          }
        />
        {renderDrawer()}
      </NctsPageContainer>
    );
  }

  // Card view
  return (
    <NctsPageContainer
      title="Facilities"
      subTitle="Manage your cultivation and processing facilities"
      extra={
        <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>
          Add Facility
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        {facilities.map((f) => (
          <Col key={f.id} xl={12} md={24} xs={24}>
            <Card
              style={{ borderLeft: `4px solid ${TYPE_COLORS[f.type]}`, height: '100%' }}
              styles={{ body: { padding: 20 } }}
            >
              {/* Header: name + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={20} color={TYPE_COLORS[f.type]} />
                  <Text strong style={{ fontSize: 16 }}>{f.name}</Text>
                </div>
                <StatusBadge status={f.status} size="sm" />
              </div>

              {/* Type tag */}
              <div style={{ marginBottom: 12 }}>
                <Tag color={TYPE_TAG_COLORS[f.type]}>{f.type.charAt(0).toUpperCase() + f.type.slice(1)}</Tag>
              </div>

              {/* Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MapPin size={14} color="#8c8c8c" />
                <Text type="secondary">{f.province}, {f.city}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 20, display: 'block', marginBottom: 12 }}>
                GPS: {f.gpsLat.toFixed(4)}, {f.gpsLng.toFixed(4)}
              </Text>

              {/* Key metrics */}
              <Text style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                {f.activePlants} active plants&nbsp;&nbsp;|&nbsp;&nbsp;Area: {f.areaSqm.toLocaleString()} m²
              </Text>

              {/* License number */}
              {f.licenseNumber && (
                <div style={{ marginBottom: 16 }}>
                  <TrackingId id={f.licenseNumber} size="sm" copyable />
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="small"
                  icon={<Eye size={14} />}
                  onClick={() => navigate(`/operator/facilities`)}
                >
                  View Details
                </Button>
                <Button
                  size="small"
                  icon={<Pencil size={14} />}
                  onClick={() => openEdit(f)}
                >
                  Edit
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {renderDrawer()}
    </NctsPageContainer>
  );

  // -----------------------------------------------------------------------
  // Drawer renderer
  // -----------------------------------------------------------------------
  function renderDrawer() {
    return (
      <Drawer
        title={editingFacility ? 'Edit Facility' : 'Add Facility'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Button type="primary" onClick={handleSubmit}>
            {editingFacility ? 'Save Changes' : 'Add Facility'}
          </Button>
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="name" label="Facility Name" rules={[{ required: true, message: 'Facility name is required' }]}>
            <Input placeholder="e.g. Stellenbosch Cultivation Centre" />
          </Form.Item>

          <Form.Item name="type" label="Facility Type" rules={[{ required: true, message: 'Please select a facility type' }]}>
            <Select placeholder="Select type">
              <Select.Option value="cultivation">Cultivation</Select.Option>
              <Select.Option value="processing">Processing</Select.Option>
              <Select.Option value="distribution">Distribution</Select.Option>
              <Select.Option value="retail">Retail</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="province" label="Province" rules={[{ required: true, message: 'Province is required' }]}>
            <Select placeholder="Select province">
              {SA_PROVINCES.map((p) => (
                <Select.Option key={p} value={p}>{p}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="city" label="City" rules={[{ required: true, message: 'City is required' }]}>
            <Input placeholder="e.g. Stellenbosch" />
          </Form.Item>

          <Form.Item name="streetAddress" label="Street Address" rules={[{ required: true, message: 'Street address is required' }]}>
            <Input.TextArea rows={2} placeholder="e.g. 24 Dorp Street" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <Form.Item name="gpsLat" label="GPS Latitude" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} placeholder="-33.9346" step={0.0001} />
            </Form.Item>
            <Form.Item name="gpsLng" label="GPS Longitude" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} placeholder="18.8602" step={0.0001} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 24 }}>
              <Button icon={<Navigation size={14} />} onClick={handleUseMyLocation}>
                Use My Location
              </Button>
            </Form.Item>
          </div>

          <Form.Item
            name="areaSqm"
            label="Total Area (m²)"
            rules={[
              { required: true, message: 'Area is required' },
              { type: 'number', min: 1, message: 'Area must be greater than 0' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="e.g. 2400" min={1} />
          </Form.Item>

          <Form.Item name="licenseNumber" label="License Number">
            <Input placeholder="e.g. FAC-20250115-STL (optional)" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: 'Description cannot exceed 500 characters' }]}
          >
            <Input.TextArea rows={3} placeholder="Optional description (max 500 characters)" showCount maxLength={500} />
          </Form.Item>
        </Form>
      </Drawer>
    );
  }
}
