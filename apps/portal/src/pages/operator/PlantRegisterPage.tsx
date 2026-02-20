import { useState } from 'react';
import { Steps, Form, Select, DatePicker, InputNumber, Button, Descriptions, Result, message, Spin } from 'antd';
import { PlusOutlined, ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';
import { useFacilities, useFacilityZones, useCreatePlant, useBatchRegisterPlants } from '@ncts/api-client';
import type { CreatePlantDto } from '@ncts/shared-types';
import dayjs from 'dayjs';

const STRAINS = [
  { value: 'strain-durban-poison', label: 'Durban Poison (Sativa)' },
  { value: 'strain-swazi-gold', label: 'Swazi Gold (Sativa)' },
  { value: 'strain-malawi-gold', label: 'Malawi Gold (Sativa)' },
  { value: 'strain-rooibaard', label: 'Rooibaard (Indica)' },
];

const steps = [
  { title: 'Strain', description: 'Select cultivar' },
  { title: 'Location', description: 'Facility & zone' },
  { title: 'Details', description: 'Quantity & date' },
  { title: 'Review', description: 'Confirm & submit' },
];

export default function PlantRegisterPage() {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [selFacility, setSelFacility] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const [count, setCount] = useState(0);

  const { data: facData, isLoading: fl } = useFacilities({ page: 1, limit: 100 });
  const { data: zoneData, isLoading: zl } = useFacilityZones(selFacility ?? '');
  const createPlant = useCreatePlant();
  const batchReg = useBatchRegisterPlants();

  const facilities = facData?.data ?? [];
  const zones = (zoneData as any) ?? [];

  const next = async () => { try { await form.validateFields(); if (current === 1) setSelFacility(form.getFieldValue('facilityId')); setCurrent(c => c + 1); } catch {} };
  const prev = () => setCurrent(c => c - 1);

  const handleSubmit = async () => {
    const v = form.getFieldsValue(true);
    const qty = v.quantity ?? 1;
    const date = (v.plantedDate as dayjs.Dayjs)?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD');
    const base: CreatePlantDto = { strainId: v.strainId, facilityId: v.facilityId, zoneId: v.zoneId, plantedDate: date };
    try {
      if (qty === 1) await createPlant.mutateAsync(base);
      else await batchReg.mutateAsync({ plants: Array.from({ length: qty }, () => ({ ...base })) });
      setCount(qty); setSubmitted(true);
      message.success(`${qty} plant${qty > 1 ? 's' : ''} registered`);
    } catch (e: any) { message.error(e?.message ?? 'Failed'); }
  };

  if (submitted) return (
    <Result status="success" title={`${count} Plant${count > 1 ? 's' : ''} Registered`}
      subTitle="Tracking IDs generated. View them on the Plants page."
      extra={[<Button key="a" type="primary" onClick={() => { setSubmitted(false); setCurrent(0); form.resetFields(); }}>Register More</Button>]}
    />
  );

  const v = form.getFieldsValue(true);

  return (
    <div>
      <div className="page-header"><h2><PlusOutlined style={{ marginRight: 8 }} />Register New Plants</h2></div>
      <Steps current={current} items={steps} style={{ marginBottom: 28 }} />
      <div className="content-card">
        <Form form={form} layout="vertical" style={{ maxWidth: 560 }}>
          <div style={{ display: current === 0 ? 'block' : 'none' }}>
            <Form.Item name="strainId" label="Cannabis Strain / Cultivar" rules={[{ required: true }]}>
              <Select placeholder="Select strain" options={STRAINS} showSearch optionFilterProp="label" />
            </Form.Item>
          </div>
          <div style={{ display: current === 1 ? 'block' : 'none' }}>
            <Spin spinning={fl}>
              <Form.Item name="facilityId" label="Facility" rules={[{ required: true }]}>
                <Select placeholder="Select facility" onChange={(v) => { setSelFacility(v); form.setFieldValue('zoneId', undefined); }}
                  options={facilities.map(f => ({ value: f.id, label: `${f.name} — ${f.province}` }))} />
              </Form.Item>
            </Spin>
            {selFacility && <Spin spinning={zl}>
              <Form.Item name="zoneId" label="Growing Zone" rules={[{ required: true }]}>
                <Select placeholder="Select zone" options={zones.map((z: any) => ({ value: z.id, label: `${z.name} (${z.zoneType ?? 'zone'})` }))} />
              </Form.Item>
            </Spin>}
          </div>
          <div style={{ display: current === 2 ? 'block' : 'none' }}>
            <Form.Item name="plantedDate" label="Planting Date" rules={[{ required: true }]} initialValue={dayjs()}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="quantity" label="Number of Plants" rules={[{ required: true }]} initialValue={1}>
              <InputNumber min={1} max={1000} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          {current === 3 && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Strain">{STRAINS.find(s => s.value === v.strainId)?.label ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Facility">{facilities.find(f => f.id === v.facilityId)?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Zone">{zones.find((z: any) => z.id === v.zoneId)?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Planting Date">{v.plantedDate?.format?.('YYYY-MM-DD') ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Quantity">{v.quantity ?? 1}</Descriptions.Item>
            </Descriptions>
          )}
        </Form>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
          {current > 0 && <Button icon={<ArrowLeftOutlined />} onClick={prev}>Back</Button>}
          <div style={{ marginLeft: 'auto' }}>
            {current < 3 && <Button type="primary" icon={<ArrowRightOutlined />} onClick={next}>Next</Button>}
            {current === 3 && <Button type="primary" icon={<CheckOutlined />} onClick={handleSubmit} loading={createPlant.isPending || batchReg.isPending}>Register {v.quantity ?? 1} Plants</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
