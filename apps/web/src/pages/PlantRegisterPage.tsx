import { useState } from 'react';
import {
  Typography,
  Steps,
  Form,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Descriptions,
  Result,
  message,
  Space,
  Spin,
  Alert,
} from 'antd';
import { PlusOutlined, ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';
import { useFacilities, useFacilityZones, useCreatePlant, useBatchRegisterPlants } from '@ncts/api-client';
import type { CreatePlantDto } from '@ncts/shared-types';
import dayjs from 'dayjs';

const { Title } = Typography;

const STRAINS = [
  { value: 'strain-durban-poison', label: 'Durban Poison (Sativa)' },
  { value: 'strain-swazi-gold', label: 'Swazi Gold (Sativa)' },
  { value: 'strain-malawi-gold', label: 'Malawi Gold (Sativa)' },
  { value: 'strain-rooibaard', label: 'Rooibaard (Indica)' },
];

const steps = [
  { title: 'Strain', description: 'Select cultivar' },
  { title: 'Location', description: 'Facility & zone' },
  { title: 'Quantity', description: 'Number of plants' },
  { title: 'Review', description: 'Confirm & submit' },
];

export default function PlantRegisterPage() {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);

  const { data: facilitiesData, isLoading: facilitiesLoading } = useFacilities({ page: 1, limit: 100 });
  const { data: zonesData, isLoading: zonesLoading } = useFacilityZones(selectedFacilityId ?? '');
  const createPlant = useCreatePlant();
  const batchRegister = useBatchRegisterPlants();

  const facilities = facilitiesData?.data ?? [];
  const zones = zonesData ?? [];

  const next = async () => {
    try {
      await form.validateFields();
      if (current === 1) {
        setSelectedFacilityId(form.getFieldValue('facilityId'));
      }
      setCurrent(current + 1);
    } catch {
      // validation failed
    }
  };

  const prev = () => setCurrent(current - 1);

  const handleSubmit = async () => {
    const values = form.getFieldsValue(true);
    const quantity: number = values.quantity ?? 1;
    const plantDate = (values.plantedDate as dayjs.Dayjs)?.format('YYYY-MM-DD') ?? new Date().toISOString().slice(0, 10);

    const basePlant: CreatePlantDto = {
      strainId: values.strainId,
      facilityId: values.facilityId,
      zoneId: values.zoneId,
      plantedDate: plantDate,
    };

    try {
      if (quantity === 1) {
        await createPlant.mutateAsync(basePlant);
      } else {
        const plants = Array.from({ length: quantity }, () => ({ ...basePlant }));
        await batchRegister.mutateAsync({ plants });
      }
      setRegisteredCount(quantity);
      setSubmitted(true);
      message.success(`${quantity} plant${quantity > 1 ? 's' : ''} registered successfully!`);
    } catch (err: any) {
      message.error(err?.message ?? 'Failed to register plants');
    }
  };

  if (submitted) {
    return (
      <Result
        status="success"
        title={`${registeredCount} Plant${registeredCount > 1 ? 's' : ''} Registered`}
        subTitle="Tracking IDs have been generated. You can view your plants on the Plants page."
        extra={[
          <Button key="again" type="primary" icon={<PlusOutlined />} onClick={() => { setSubmitted(false); setCurrent(0); form.resetFields(); }}>
            Register More
          </Button>,
          <Button key="list" href="/plants">View Plants</Button>,
        ]}
      />
    );
  }

  const formValues = form.getFieldsValue(true);
  const selectedStrain = STRAINS.find((s) => s.value === formValues.strainId);
  const selectedFacility = facilities.find((f) => f.id === formValues.facilityId);
  const selectedZone = zones.find((z: any) => z.id === formValues.zoneId);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        <PlusOutlined style={{ marginRight: 8 }} />
        Register New Plants
      </Title>

      <Steps current={current} items={steps} style={{ marginBottom: 32 }} />

      <Card>
        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          {/* Step 0: Strain */}
          <div style={{ display: current === 0 ? 'block' : 'none' }}>
            <Form.Item name="strainId" label="Cannabis Strain / Cultivar" rules={[{ required: true, message: 'Select a strain' }]}>
              <Select placeholder="Select strain" options={STRAINS} size="large" showSearch optionFilterProp="label" />
            </Form.Item>
          </div>

          {/* Step 1: Location */}
          <div style={{ display: current === 1 ? 'block' : 'none' }}>
            <Spin spinning={facilitiesLoading}>
              <Form.Item name="facilityId" label="Facility" rules={[{ required: true, message: 'Select a facility' }]}>
                <Select
                  placeholder="Select facility"
                  size="large"
                  onChange={(val) => { setSelectedFacilityId(val); form.setFieldValue('zoneId', undefined); }}
                  options={facilities.map((f) => ({ value: f.id, label: `${f.name} — ${f.province}` }))}
                />
              </Form.Item>
            </Spin>
            {selectedFacilityId && (
              <Spin spinning={zonesLoading}>
                <Form.Item name="zoneId" label="Growing Zone" rules={[{ required: true, message: 'Select a zone' }]}>
                  <Select
                    placeholder="Select zone"
                    size="large"
                    options={zones.map((z: any) => ({ value: z.id, label: `${z.name} (${z.zoneType})` }))}
                  />
                </Form.Item>
              </Spin>
            )}
          </div>

          {/* Step 2: Quantity */}
          <div style={{ display: current === 2 ? 'block' : 'none' }}>
            <Form.Item name="plantedDate" label="Planting Date" rules={[{ required: true, message: 'Select planting date' }]} initialValue={dayjs()}>
              <DatePicker size="large" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="quantity" label="Number of Plants" rules={[{ required: true, message: 'Enter quantity' }]} initialValue={1}>
              <InputNumber min={1} max={1000} size="large" style={{ width: '100%' }} />
            </Form.Item>
            {(formValues.quantity ?? 1) > 100 && (
              <Alert type="info" message={`Registering ${formValues.quantity} plants will use batch registration for efficiency.`} showIcon style={{ marginBottom: 16 }} />
            )}
          </div>

          {/* Step 3: Review */}
          {current === 3 && (
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Strain">{selectedStrain?.label ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Facility">{selectedFacility?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Zone">{selectedZone?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Planting Date">{formValues.plantedDate?.format?.('YYYY-MM-DD') ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Quantity">{formValues.quantity ?? 1}</Descriptions.Item>
            </Descriptions>
          )}
        </Form>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
          {current > 0 && (
            <Button icon={<ArrowLeftOutlined />} onClick={prev}>Back</Button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            {current < steps.length - 1 && (
              <Button type="primary" icon={<ArrowRightOutlined />} onClick={next}>Next</Button>
            )}
            {current === steps.length - 1 && (
              <Space>
                <Button type="primary" icon={<CheckOutlined />} onClick={handleSubmit} loading={createPlant.isPending || batchRegister.isPending}>
                  Register {formValues.quantity ?? 1} Plant{(formValues.quantity ?? 1) > 1 ? 's' : ''}
                </Button>
              </Space>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
