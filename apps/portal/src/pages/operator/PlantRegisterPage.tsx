import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutoComplete, Button, Checkbox, Descriptions, QRCode, Result, Upload, message } from 'antd';
import {
  StepsForm,
  ProFormText,
  ProFormSelect,
  ProFormDatePicker,
  ProFormTextArea,
  ProFormRadio,
  ProFormDigit,
} from '@ant-design/pro-components';
import { UploadCloud } from 'lucide-react';
import { PlantLifecycle, TrackingId, PrintButton } from '@ncts/ui';
import dayjs from 'dayjs';

// ---------------------------------------------------------------------------
// Mock data — TODO: Replace with real API calls
// ---------------------------------------------------------------------------

const MOCK_MOTHER_PLANTS = [
  { value: 'MP-001', label: 'MP-001 — Durban Poison' },
  { value: 'MP-002', label: 'MP-002 — Swazi Gold' },
  { value: 'MP-003', label: 'MP-003 — Malawi Gold' },
];

const MOCK_STRAINS = [
  'Durban Poison',
  'Swazi Gold',
  'Malawi Gold',
  'Rooibaard',
  'Power Plant',
  'White Widow',
  'Jack Herer',
];

const MOCK_FACILITIES = [
  { value: 'fac-001', label: 'Cape Town Indoor — Western Cape' },
  { value: 'fac-002', label: 'Johannesburg Greenhouse — Gauteng' },
  { value: 'fac-003', label: 'Durban Outdoor — KwaZulu-Natal' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTrackingId(): string {
  const datePart = dayjs().format('YYYYMMDD');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PLT-${datePart}-${rand}`;
}

const SOURCE_LABELS: Record<string, string> = {
  seed: 'Seed',
  clone: 'Clone',
  mother_plant: 'Mother Plant',
};

const STRAIN_TYPE_LABELS: Record<string, string> = {
  indica: 'Indica',
  sativa: 'Sativa',
  hybrid: 'Hybrid',
  ruderalis: 'Ruderalis',
};

const MEDIUM_LABELS: Record<string, string> = {
  soil: 'Soil',
  hydroponic: 'Hydroponic',
  aeroponic: 'Aeroponic',
  coco_coir: 'Coco Coir',
};

const TAG_TYPE_LABELS: Record<string, string> = {
  rfid: 'RFID',
  barcode: 'Barcode',
  qr_code: 'QR Code',
  label: 'Label',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlantRegisterPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [sourceType, setSourceType] = useState<string>('seed');
  const [confirmed, setConfirmed] = useState(false);

  const trackingId = useMemo(() => generateTrackingId(), []);

  // TODO: replace with real submit via API
  const handleFinish = async (values: Record<string, any>) => {
    const allData = { ...formData, ...values, trackingId };
    setFormData(allData);
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 600));
    message.success('Plant registered successfully!');
    setSubmitted(true);
  };

  if (submitted) {
    const plantId = formData.trackingId ?? trackingId;
    return (
      <Result
        status="success"
        title="Plant Registered!"
        subTitle={`Tracking ID: ${plantId}`}
        extra={[
          <PrintButton key="print" />,
          <Button
            key="another"
            onClick={() => {
              setSubmitted(false);
              setFormData({});
              setConfirmed(false);
            }}
          >
            Register Another
          </Button>,
          <Button
            key="view"
            type="primary"
            onClick={() => navigate(`/plants/${plantId}`)}
          >
            View Plant →
          </Button>,
        ]}
      />
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 0' }}>
      <StepsForm
        onFinish={handleFinish}
        stepsProps={{ style: { marginBottom: 32 } }}
        formProps={{ layout: 'vertical' }}
      >
        {/* ── Step 1: Source Information ── */}
        <StepsForm.StepForm
          name="source"
          title="Source Information"
          onFinish={async (values) => {
            setFormData((prev) => ({ ...prev, ...values }));
            return true;
          }}
        >
          <ProFormRadio.Group
            name="sourceType"
            label="Source Type"
            rules={[{ required: true, message: 'Select a source type' }]}
            options={[
              { value: 'seed', label: 'Seed' },
              { value: 'clone', label: 'Clone' },
              { value: 'mother_plant', label: 'Mother Plant' },
            ]}
            fieldProps={{
              onChange: (e) => setSourceType(e.target.value),
            }}
            initialValue="seed"
          />

          {sourceType === 'clone' && (
            <ProFormSelect
              name="motherPlantId"
              label="Mother Plant ID"
              showSearch
              options={MOCK_MOTHER_PLANTS}
              placeholder="Search mother plant…"
            />
          )}

          {sourceType === 'seed' && (
            <ProFormText
              name="seedLotNumber"
              label="Seed Lot Number"
              placeholder="e.g. LOT-2026-0042"
            />
          )}

          <ProFormText name="supplier" label="Supplier" placeholder="Optional supplier name" />

          <ProFormDatePicker
            name="acquiredDate"
            label="Acquired Date"
            rules={[{ required: true, message: 'Select acquired date' }]}
            fieldProps={{
              disabledDate: (current: dayjs.Dayjs) => current && current.isAfter(dayjs(), 'day'),
              style: { width: '100%' },
            }}
          />

          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Acquisition Document</div>
            <Upload
              accept=".pdf,image/*"
              maxCount={1}
              beforeUpload={(file) => {
                if (file.size > 10 * 1024 * 1024) {
                  message.error('File must be smaller than 10 MB');
                  return false;
                }
                return false;
              }}
            >
              <Button icon={<UploadCloud size={14} />}>Upload</Button>
            </Upload>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>PDF or image, max 10 MB</div>
          </div>
        </StepsForm.StepForm>

        {/* ── Step 2: Plant Details ── */}
        <StepsForm.StepForm
          name="details"
          title="Plant Details"
          onFinish={async (values) => {
            setFormData((prev) => ({ ...prev, ...values }));
            return true;
          }}
        >
          <ProFormText
            name="strainName"
            label="Strain Name"
            rules={[{ required: true, message: 'Enter a strain name' }]}
            fieldProps={{
              // Wrap with AutoComplete rendered via fieldProps children
            }}
          >
            <AutoComplete
              options={MOCK_STRAINS.map((s) => ({ value: s }))}
              placeholder="Type to search strains…"
              filterOption={(input, option) =>
                (option?.value as string).toLowerCase().includes(input.toLowerCase())
              }
            />
          </ProFormText>

          <ProFormSelect
            name="strainType"
            label="Strain Type"
            rules={[{ required: true, message: 'Select strain type' }]}
            options={[
              { value: 'indica', label: 'Indica' },
              { value: 'sativa', label: 'Sativa' },
              { value: 'hybrid', label: 'Hybrid' },
              { value: 'ruderalis', label: 'Ruderalis' },
            ]}
          />

          <ProFormSelect
            name="facilityId"
            label="Assigned Facility"
            rules={[{ required: true, message: 'Select a facility' }]}
            options={MOCK_FACILITIES}
            placeholder="Select facility"
          />

          <ProFormText name="growingZone" label="Growing Area / Zone" placeholder="e.g. Zone A-3" />

          <ProFormSelect
            name="growingMedium"
            label="Growing Medium"
            rules={[{ required: true, message: 'Select growing medium' }]}
            options={[
              { value: 'soil', label: 'Soil' },
              { value: 'hydroponic', label: 'Hydroponic' },
              { value: 'aeroponic', label: 'Aeroponic' },
              { value: 'coco_coir', label: 'Coco Coir' },
            ]}
          />

          <ProFormDigit
            name="expectedFloweringWeeks"
            label="Expected Flowering Weeks"
            min={6}
            max={14}
            placeholder="6–14"
          />

          <ProFormTextArea
            name="notes"
            label="Notes"
            fieldProps={{ maxLength: 1000, showCount: true }}
            placeholder="Optional notes (max 1000 characters)"
          />
        </StepsForm.StepForm>

        {/* ── Step 3: Identification ── */}
        <StepsForm.StepForm
          name="identification"
          title="Identification"
          onFinish={async (values) => {
            setFormData((prev) => ({ ...prev, ...values, trackingId }));
            return true;
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Auto-generated Tracking ID</div>
            <TrackingId id={trackingId} size="lg" />
          </div>

          <ProFormSelect
            name="physicalTagType"
            label="Physical Tag Type"
            rules={[{ required: true, message: 'Select tag type' }]}
            options={[
              { value: 'rfid', label: 'RFID' },
              { value: 'barcode', label: 'Barcode' },
              { value: 'qr_code', label: 'QR Code' },
              { value: 'label', label: 'Label' },
            ]}
          />

          <ProFormText
            name="physicalTagNumber"
            label="Physical Tag Number"
            rules={[{ required: true, message: 'Enter tag number' }]}
            placeholder="e.g. TAG-0001"
          />

          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>QR Code Preview</div>
            <QRCode value={trackingId} size={120} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Photo of Plant</div>
            <Upload accept="image/*" maxCount={1} beforeUpload={() => false}>
              <Button icon={<UploadCloud size={14} />}>Upload Photo</Button>
            </Upload>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>Image only</div>
          </div>
        </StepsForm.StepForm>

        {/* ── Step 4: Review & Confirm ── */}
        <StepsForm.StepForm
          name="review"
          title="Review & Confirm"
          onFinish={async (values) => {
            if (!confirmed) {
              message.warning('Please confirm the information is accurate.');
              return false;
            }
            await handleFinish({ ...formData, ...values });
            return true;
          }}
        >
          <Descriptions bordered column={1} size="small" style={{ marginBottom: 24 }}>
            <Descriptions.Item label="Source Type">
              {SOURCE_LABELS[formData.sourceType] ?? '—'}
            </Descriptions.Item>
            {formData.sourceType === 'clone' && (
              <Descriptions.Item label="Mother Plant ID">
                {formData.motherPlantId ?? '—'}
              </Descriptions.Item>
            )}
            {formData.sourceType === 'seed' && (
              <Descriptions.Item label="Seed Lot Number">
                {formData.seedLotNumber ?? '—'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Supplier">{formData.supplier || '—'}</Descriptions.Item>
            <Descriptions.Item label="Acquired Date">{formData.acquiredDate ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Strain Name">{formData.strainName ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Strain Type">
              {STRAIN_TYPE_LABELS[formData.strainType] ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Facility">
              {MOCK_FACILITIES.find((f) => f.value === formData.facilityId)?.label ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Growing Zone">{formData.growingZone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Growing Medium">
              {MEDIUM_LABELS[formData.growingMedium] ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Expected Flowering Weeks">
              {formData.expectedFloweringWeeks ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Notes">{formData.notes || '—'}</Descriptions.Item>
            <Descriptions.Item label="Tracking ID">
              <TrackingId id={formData.trackingId ?? trackingId} size="sm" />
            </Descriptions.Item>
            <Descriptions.Item label="Physical Tag">
              {TAG_TYPE_LABELS[formData.physicalTagType] ?? '—'} — {formData.physicalTagNumber ?? '—'}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>Lifecycle Stage</div>
              <PlantLifecycle
                currentStage={formData.sourceType === 'clone' ? 'seedling' : 'seed'}
                size="sm"
              />
            </div>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>QR Code</div>
              <QRCode value={formData.trackingId ?? trackingId} size={120} />
            </div>
          </div>

          <Checkbox
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginBottom: 16 }}
          >
            I confirm this information is accurate and I am authorized to register this plant
          </Checkbox>
        </StepsForm.StepForm>
      </StepsForm>
    </div>
  );
}
