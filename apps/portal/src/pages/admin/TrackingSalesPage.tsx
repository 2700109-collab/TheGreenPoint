/**
 * TrackingSalesPage — National sales monitoring with excise duty tracking.
 */
import { useMemo } from 'react';
import { Card, Col, Row, Spin, Statistic } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { ShoppingCart } from 'lucide-react';
import { NctsPageContainer, StatusBadge, TrackingId, CsvExportButton, DataFreshness } from '@ncts/ui';
import { useSales } from '@ncts/api-client';

interface Sale {
  id: string;
  saleNumber: string;
  quantityGrams: number;
  priceZar: number;
  saleDate: string;
  customerVerified?: boolean;
  batch?: { batchNumber: string; strain?: { name: string } };
  facility?: { name: string };
}

const CSV_COLS = [
  { key: 'saleNumber', header: 'Sale #' },
  { key: 'batchNumber', header: 'Batch' },
  { key: 'quantityGrams', header: 'Quantity (g)' },
  { key: 'priceZar', header: 'Value (ZAR)' },
  { key: 'saleDate', header: 'Date' },
];

export default function TrackingSalesPage() {
  const { data: saleData, isLoading, refetch } = useSales();
  const sales: (Sale & { batchNumber: string })[] = useMemo(() => {
    const raw = saleData?.data ?? saleData ?? [];
    return (Array.isArray(raw) ? raw : []).map((s: any) => ({ ...s, batchNumber: s.batch?.batchNumber ?? '—' }));
  }, [saleData]);

  const totalRevenue = useMemo(() => sales.reduce((s, r) => s + Number(r.priceZar ?? 0), 0), [sales]);
  const totalQuantity = useMemo(() => sales.reduce((s, r) => s + Number(r.quantityGrams ?? 0), 0), [sales]);

  const columns: ProColumns<Sale>[] = [
    { title: 'Sale #', dataIndex: 'saleNumber', render: (_, r) => <TrackingId id={r.saleNumber} /> },
    { title: 'Batch', key: 'batch', render: (_, r) => r.batch?.batchNumber ?? '—' },
    { title: 'Product', key: 'product', render: (_, r) => r.batch?.strain?.name ?? '—' },
    { title: 'Quantity (g)', dataIndex: 'quantityGrams', render: (_, r) => Number(r.quantityGrams).toLocaleString(), sorter: (a, b) => Number(a.quantityGrams) - Number(b.quantityGrams) },
    { title: 'Value (ZAR)', dataIndex: 'priceZar', render: (_, r) => `R ${Number(r.priceZar).toLocaleString()}`, sorter: (a, b) => Number(a.priceZar) - Number(b.priceZar) },
    { title: 'Verified', key: 'verified', render: (_, r) => <StatusBadge status={r.customerVerified ? 'active' : 'pending'} /> },
    { title: 'Date', dataIndex: 'saleDate', render: (_, r) => dayjs(r.saleDate).format('DD MMM YYYY'), sorter: (a, b) => dayjs(a.saleDate).unix() - dayjs(b.saleDate).unix() },
  ];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <NctsPageContainer title="Sales Monitoring" subTitle={`${sales.length} sales recorded`}>
      <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={refetch} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24, marginTop: 16 }}>
        <Col xs={24} sm={8}><Card><Statistic title="Total Sales" value={sales.length} prefix={<ShoppingCart size={16} />} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Total Revenue" value={totalRevenue} prefix="R" precision={0} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Total Quantity" value={totalQuantity} suffix="g" precision={0} /></Card></Col>
      </Row>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <CsvExportButton data={sales} columns={CSV_COLS} filename="national-sales" />
      </div>
      <ProTable<Sale> columns={columns} dataSource={sales} rowKey="id" search={false} toolBarRender={false} pagination={{ pageSize: 20, showSizeChanger: true }} />
    </NctsPageContainer>
  );
}
