/**
 * CreateInspectionPage — Schedule a new inspection via StepsForm.
 * Per FrontEnd.md §4.9.2.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, List, message, Space } from 'antd';
import {
  StepsForm,
  ProFormText,
  ProFormSelect,
  ProFormDatePicker,
  ProFormTextArea,
  ProFormDigit,
  ProFormRadio,
} from '@ant-design/pro-components';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { NctsPageContainer } from '@ncts/ui';

dayjs.extend(relativeTime);

// suppress unused-import lint — ProFormText is used in Step 2 placeholder label
void ProFormText;

// ---------------------------------------------------------------------------
// Mock data — TODO: Replace with API hooks
// ---------------------------------------------------------------------------

const MOCK_FACILITIES = [
  { label: 'GreenLeaf Cultivation (FAC-01)', value: 'FAC-01' },
  { label: 'Cape Cannabis Processing (FAC-02)', value: 'FAC-02' },
  { label: 'Durban Botanicals (FAC-03)', value: 'FAC-03' },
  { label: 'Highveld Growers (FAC-04)', value: 'FAC-04' },
  { label: 'Eastern Roots Trading (FAC-05)', value: 'FAC-05' },
];

const MOCK_INSPECTORS = [
  { label: 'N. Mthembu', value: 'usr-01' },
  { label: 'T. Nkosi', value: 'usr-02' },
  { label: 'B. Dlamini', value: 'usr-03' },
  { label: 'S. Mokoena', value: 'usr-04' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

// ---------------------------------------------------------------------------
// Default checklists by inspection type — TODO: fetch from API
// ---------------------------------------------------------------------------

const CHECKLISTS: Record<string, string[]> = {
  Routine: [
    'Cultivation area cleanliness & organisation',
    'Security systems & access control',
    'Record-keeping & documentation',
    'Waste disposal procedures',
    'Plant tagging & traceability',
    'Storage conditions & inventory',
    'Staff credentials & training records',
  ],
  Complaint: [
    'Specific complaint allegation verification',
    'Related documentation review',
    'Staff interviews',
    'Physical evidence collection',
    'Corrective action review',
  ],
  'Follow-up': [
    'Previous finding remediation status',
    'Corrective action verification',
    'Timeline compliance',
    'Documentation update check',
  ],
  Random: [
    'Cultivation area spot-check',
    'Security systems verification',
    'Record-keeping audit',
    'Plant tagging verification',
    'Storage conditions check',
  ],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateInspectionPage() {
  const navigate = useNavigate();
  const [inspectionType, setInspectionType] = useState<string>('Routine');
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const currentChecklist = CHECKLISTS[inspectionType] ?? CHECKLISTS['Routine']!;

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <NctsPageContainer
      title="Schedule Inspection"
      subTitle="Create a new facility inspection"
      extra={
        <Button
          type="text"
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          style={{ fontWeight: 500 }}
        >
          Back
        </Button>
      }
    >
      <StepsForm
        onFinish={async () => {
          // TODO: POST /inspections with form data
          message.success('Inspection scheduled successfully!');
          navigate('/compliance/inspections');
        }}
        formProps={{ validateMessages: { required: '${label} is required' } }}
        stepsFormRender={(_dom, submitter) => (
          <div>
            {_dom}
            <div style={{ marginTop: 24, textAlign: 'right' }}>{submitter}</div>
          </div>
        )}
      >
        {/* ── Step 1: Inspection Details ──────────────────────────── */}
        <StepsForm.StepForm
          name="details"
          title="Inspection Details"
          stepProps={{ icon: <ClipboardCheck size={18} /> }}
          style={{ maxWidth: 640 }}
        >
          <ProFormSelect
            name="facilityId"
            label="Facility"
            placeholder="Select a facility"
            options={MOCK_FACILITIES}
            rules={[{ required: true }]}
          />
          <ProFormRadio.Group
            name="type"
            label="Inspection Type"
            radioType="button"
            initialValue="Routine"
            fieldProps={{
              onChange: (e) => {
                setInspectionType(e.target.value as string);
                setCheckedItems({});
              },
            }}
            options={['Routine', 'Complaint', 'Follow-up', 'Random']}
            rules={[{ required: true }]}
          />
          <ProFormSelect
            name="priority"
            label="Priority"
            placeholder="Select priority level"
            options={PRIORITY_OPTIONS}
            initialValue="medium"
            rules={[{ required: true }]}
          />
          <ProFormDatePicker
            name="scheduledDate"
            label="Scheduled Date"
            rules={[{ required: true }]}
            fieldProps={{
              disabledDate: (current: dayjs.Dayjs) => current && current.isBefore(dayjs(), 'day'),
              style: { width: '100%' },
            }}
          />
          <ProFormDigit
            name="estimatedDuration"
            label="Estimated Duration (hours)"
            min={0.5}
            initialValue={2}
            fieldProps={{ step: 0.5, precision: 1 }}
            rules={[{ required: true }]}
          />
          <ProFormTextArea
            name="reasonNotes"
            label="Reason / Notes"
            placeholder="Provide reason or additional notes…"
            rules={[
              {
                required: inspectionType === 'Complaint' || inspectionType === 'Follow-up',
                message: 'Reason is required for Complaint and Follow-up inspections',
              },
            ]}
            fieldProps={{ rows: 3, showCount: true, maxLength: 500 }}
          />
        </StepsForm.StepForm>

        {/* ── Step 2: Assign Inspector ───────────────────────────── */}
        <StepsForm.StepForm
          name="inspector"
          title="Assign Inspector"
          style={{ maxWidth: 640 }}
        >
          <ProFormSelect
            name="leadInspector"
            label="Lead Inspector"
            placeholder="Select lead inspector"
            options={MOCK_INSPECTORS}
            rules={[{ required: true }]}
          />
          <ProFormSelect
            name="additionalInspectors"
            label="Additional Inspectors"
            placeholder="Select additional inspectors (optional)"
            options={MOCK_INSPECTORS}
            fieldProps={{ mode: 'multiple' }}
          />
          <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 500 }}>Notifications</div>
          <Space direction="vertical" size={8}>
            <Checkbox defaultChecked>Email inspector with assignment details</Checkbox>
            <Checkbox defaultChecked>Email facility contact with scheduled date</Checkbox>
            <Checkbox>SMS facility contact with scheduled date</Checkbox>
          </Space>
        </StepsForm.StepForm>

        {/* ── Step 3: Checklist ──────────────────────────────────── */}
        <StepsForm.StepForm
          name="checklist"
          title="Checklist"
          style={{ maxWidth: 640 }}
        >
          <div style={{ marginBottom: 12, color: '#595959' }}>
            Default checklist items for <strong>{inspectionType}</strong> inspections:
          </div>
          <List
            bordered
            dataSource={currentChecklist}
            renderItem={(item, idx) => (
              <List.Item>
                <Checkbox
                  checked={!!checkedItems[idx]}
                  onChange={() => toggleCheck(idx)}
                  style={{ width: '100%' }}
                >
                  {item}
                </Checkbox>
              </List.Item>
            )}
          />
        </StepsForm.StepForm>
      </StepsForm>
    </NctsPageContainer>
  );
}
