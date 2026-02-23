/**
 * ReportsPage — Monthly, INCB, and Custom report generation.
 * Per FrontEnd.md §4.6.
 */

import { useState } from 'react';
import { Card, Tabs, DatePicker, Select, Table, Button, Row, Col, Space, Spin, Statistic } from 'antd';
import { FileText, Download, Wrench } from 'lucide-react';
import { NctsPageContainer } from '@ncts/ui';
import { useSalesAggregate } from '@ncts/api-client';

// ---------------------------------------------------------------------------
// Mock Data DELETED WHERE POSSIBLE — province/INCB data kept as specialized aggregations
// ---------------------------------------------------------------------------

const PROVINCE_DATA = [
  { key: '1', province: 'Gauteng', operators: 14, plants: 15200, transfers: 62, sales: 'R 540K' },
  { key: '2', province: 'Western Cape', operators: 11, plants: 28300, transfers: 48, sales: 'R 480K' },
  { key: '3', province: 'KwaZulu-Natal', operators: 8, plants: 9400, transfers: 31, sales: 'R 310K' },
  { key: '4', province: 'Mpumalanga', operators: 5, plants: 6200, transfers: 22, sales: 'R 220K' },
  { key: '5', province: 'Eastern Cape', operators: 4, plants: 3100, transfers: 18, sales: 'R 180K' },
  { key: '6', province: 'Free State', operators: 3, plants: 1800, transfers: 14, sales: 'R 140K' },
  { key: '7', province: 'Limpopo', operators: 6, plants: 19750, transfers: 21, sales: 'R 130K' },
  { key: '8', province: 'North West', operators: 4, plants: 8100, transfers: 10, sales: 'R 60K' },
  { key: '9', province: 'Northern Cape', operators: 2, plants: 950, transfers: 8, sales: 'R 40K' },
];

const INCB_DATA = [
  { key: '1', field: 'Total Cultivation Area', value: '1,245 ha' },
  { key: '2', field: 'Total Plants', value: '92,800' },
  { key: '3', field: 'Production (kg)', value: '34,560' },
  { key: '4', field: 'Exports (kg)', value: '12,340' },
  { key: '5', field: 'Destruction (kg)', value: '2,180' },
];

// ---------------------------------------------------------------------------
// Province Table columns
// ---------------------------------------------------------------------------

const provinceColumns = [
  { title: 'Province', dataIndex: 'province', key: 'province' },
  { title: 'Operators', dataIndex: 'operators', key: 'operators' },
  { title: 'Plants', dataIndex: 'plants', key: 'plants', render: (v: number) => v.toLocaleString() },
  { title: 'Transfers', dataIndex: 'transfers', key: 'transfers' },
  { title: 'Sales', dataIndex: 'sales', key: 'sales' },
];

const incbColumns = [
  { title: 'INCB Field', dataIndex: 'field', key: 'field' },
  { title: 'Value', dataIndex: 'value', key: 'value' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('monthly');
  const { data: salesAggResponse, isLoading } = useSalesAggregate('monthly');

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  const salesAgg = salesAggResponse?.data ?? salesAggResponse ?? [];
  const totalSalesCount = (salesAgg as any[]).reduce((sum: number, s: any) => sum + (s.count ?? 0), 0);
  const totalSalesValue = (salesAgg as any[]).reduce((sum: number, s: any) => sum + (s.total ?? 0), 0);

  // -- Monthly Report Tab ---------------------------------------------------
  const monthlyTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card size="small">
        <Space>
          <span style={{ fontWeight: 500 }}>Period:</span>
          <DatePicker picker="month" style={{ width: 200 }} />
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}><Card><Statistic title="New Operators" value={12} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card><Statistic title="Permits Issued" value={8} /></Card></Col>
        <Col xs={12} sm={8} lg={5}><Card><Statistic title="Plants Registered" value={1847} /></Card></Col>
        <Col xs={12} sm={8} lg={5}><Card><Statistic title="Transfers" value={234} /></Card></Col>
        <Col xs={12} sm={8} lg={6}><Card><Statistic title="Sales Volume" value="R 2.1M" /></Card></Col>
      </Row>

      <Card title="Province Breakdown">
        <Table
          dataSource={PROVINCE_DATA}
          columns={provinceColumns}
          pagination={false}
          size="small"
        />
      </Card>

      <Space>
        <Button type="primary" icon={<FileText size={14} />}>Export PDF</Button>
        <Button icon={<Download size={14} />}>Export CSV</Button>
      </Space>
    </div>
  );

  // -- INCB Export Tab -------------------------------------------------------
  const incbTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card size="small">
        <Space>
          <span style={{ fontWeight: 500 }}>Year:</span>
          <Select
            defaultValue="2026"
            style={{ width: 120 }}
            options={[
              { value: '2024', label: '2024' },
              { value: '2025', label: '2025' },
              { value: '2026', label: '2026' },
            ]}
          />
        </Space>
      </Card>

      <Card title="INCB Annual Report Preview">
        <Table
          dataSource={INCB_DATA}
          columns={incbColumns}
          pagination={false}
          size="small"
        />
      </Card>

      <Button type="primary" icon={<FileText size={14} />}>Generate INCB Report</Button>
    </div>
  );

  // -- Custom Report Tab ----------------------------------------------------
  const customTab = (
    <Card style={{ textAlign: 'center', padding: 48 }}>
      <Wrench size={48} style={{ color: '#bfbfbf', marginBottom: 16 }} />
      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Report Builder coming soon</div>
      {/* TODO: Implement custom report builder with drag-and-drop fields */}
      <div style={{ color: '#8c8c8c' }}>
        Build custom compliance and operational reports with flexible filters and visualisations.
      </div>
    </Card>
  );

  // -- Render ---------------------------------------------------------------
  return (
    <NctsPageContainer title="Reports">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'monthly', label: 'Monthly Report', children: monthlyTab },
          { key: 'incb', label: 'INCB Export', children: incbTab },
          { key: 'custom', label: 'Custom Report', children: customTab },
        ]}
      />
    </NctsPageContainer>
  );
}
