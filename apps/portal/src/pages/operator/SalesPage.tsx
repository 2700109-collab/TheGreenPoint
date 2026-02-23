/**
 * SalesPage — Sales management with ProTable, Record Sale drawer, and CSV export.
 * Per FrontEnd.md §3.9.
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Button, Drawer, Form, Tag, Space, message, Select, DatePicker,
  InputNumber, Input, Typography, Divider, Dropdown, Table, Spin,
} from 'antd';
import type { MenuProps } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { Plus, ShoppingCart, Eye, FileText, XCircle, MoreVertical } from 'lucide-react';
import { StatusBadge, TrackingId, NctsPageContainer, CsvExportButton } from '@ncts/ui';
import { useSales, useRecordSale, useBatches } from '@ncts/api-client';

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SaleStatus = 'completed' | 'pending' | 'invoiced' | 'void' | 'draft' | 'dispatched';

interface Sale {
  id: string;
  trackingId: string;
  buyerName: string;
  buyerLicense: string;
  productSummary: string;
  totalQuantity: number;
  quantityUnit: 'g' | 'units';
  totalValue: number;
  saleDate: string;
  status: SaleStatus;
  paymentMethod: string;
  invoiceNumber: string | null;
  notes: string;
}

interface AvailableProduct {
  id: string;
  trackingId: string;
  strain: string;
  availableQty: number;
  unitPrice: number;
}



// ---------------------------------------------------------------------------
// CSV columns
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { key: 'trackingId', header: 'Sale ID' },
  { key: 'buyerName', header: 'Buyer' },
  { key: 'buyerLicense', header: 'Buyer License' },
  { key: 'productSummary', header: 'Products' },
  { key: 'totalQuantity', header: 'Quantity' },
  { key: 'totalValue', header: 'Value (ZAR)', formatter: (v: number) => v.toFixed(2) },
  { key: 'saleDate', header: 'Sale Date' },
  { key: 'status', header: 'Status' },
  { key: 'paymentMethod', header: 'Payment Method' },
  { key: 'invoiceNumber', header: 'Invoice #', formatter: (v: string | null) => v ?? '' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatZAR(value: number): string {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQuantity(qty: number, unit: 'g' | 'units'): string {
  if (unit === 'g') return qty >= 1000 ? `${(qty / 1000).toFixed(1)} kg` : `${qty} g`;
  return `${qty} units`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SalesPage() {
  const actionRef = useRef<ActionType>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productPrices, setProductPrices] = useState<Record<string, number>>({});

  const { data: salesResponse, isLoading, refetch } = useSales();
  const sales: Sale[] = ((salesResponse as any)?.data ?? salesResponse ?? []) as Sale[];

  const { data: batchesResponse } = useBatches();
  const products: AvailableProduct[] = useMemo(() => {
    const raw: any[] = (batchesResponse as any)?.data ?? batchesResponse ?? [];
    return raw.map((b: any) => ({
      id: b.id,
      trackingId: b.trackingId ?? b.id,
      strain: b.strain ?? '',
      availableQty: b.availableQty ?? b.quantity ?? 0,
      unitPrice: b.unitPrice ?? 0,
    }));
  }, [batchesResponse]);

  const recordSale = useRecordSale();

  if (isLoading) return <div style={{display:'flex',justifyContent:'center',padding:'100px 0'}}><Spin size="large" /></div>;

  // -- Computed values --------------------------------------------------------

  const totalRevenue = useMemo(
    () => sales.filter((s) => s.status !== 'void').reduce((sum, s) => sum + s.totalValue, 0),
    [sales],
  );

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedProductIds.includes(p.id)),
    [selectedProductIds, products],
  );

  const computedTotal = useMemo(() => {
    return selectedProducts.reduce((sum, p) => {
      const price = productPrices[p.id] ?? p.unitPrice;
      return sum + price * p.availableQty;
    }, 0);
  }, [selectedProducts, productPrices]);

  const vatAmount = useMemo(() => computedTotal * 0.15, [computedTotal]);

  // -- Callbacks --------------------------------------------------------------

  const handleOpenDrawer = useCallback(() => {
    form.resetFields();
    setSelectedProductIds([]);
    setProductPrices({});
    setDrawerOpen(true);
  }, [form]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await form.validateFields();
      if (selectedProductIds.length === 0) {
        message.warning('Please select at least one product');
        return;
      }
      const values = form.getFieldsValue();
      await recordSale.mutateAsync({
        ...values,
        products: selectedProductIds,
      } as any);
      message.success('Sale recorded successfully');
      setDrawerOpen(false);
      form.resetFields();
      setSelectedProductIds([]);
      setProductPrices({});
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return; // validation errors shown inline
      message.error(err?.message ?? 'Failed to record sale');
    }
  }, [form, selectedProductIds, recordSale, refetch]);

  const handleBuyerLicenseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const license = e.target.value;
      // TODO: Real API lookup by license number
      if (license.length >= 8) {
        const mockLookup: Record<string, string> = {
          'LIC-GP-0012': 'Verdant Wellness CC',
          'LIC-GP-0045': 'Highveld Dispensary',
          'LIC-WC-0089': 'Cape Herbalist (Pty) Ltd',
          'LIC-GP-0103': 'Jozi Natural Remedies',
          'LIC-EC-0034': 'Garden Route Organics',
        };
        const name = mockLookup[license];
        if (name) form.setFieldsValue({ buyerName: name });
      }
    },
    [form],
  );

  const getRowMenuItems = useCallback((_record: Sale): MenuProps['items'] => [
    { key: 'view', icon: <Eye size={14} />, label: 'View' },
    { key: 'invoice', icon: <FileText size={14} />, label: 'Invoice' },
    { key: 'void', icon: <XCircle size={14} />, label: 'Void', danger: true },
  ], []);

  // -- Product selection table columns -----------------------------------------

  const productColumns = useMemo(() => [
    {
      title: 'Product ID',
      dataIndex: 'trackingId',
      width: 160,
      render: (val: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{val}</Text>
      ),
    },
    {
      title: 'Strain',
      dataIndex: 'strain',
      width: 130,
    },
    {
      title: 'Available Qty',
      dataIndex: 'availableQty',
      width: 110,
      render: (val: number) => `${val} g`,
    },
    {
      title: 'Unit Price (ZAR/g)',
      dataIndex: 'unitPrice',
      width: 140,
      render: (_: number, record: AvailableProduct) => (
        <InputNumber
          size="small"
          min={0}
          step={5}
          value={productPrices[record.id] ?? record.unitPrice}
          onChange={(val) =>
            setProductPrices((prev) => ({ ...prev, [record.id]: val ?? record.unitPrice }))
          }
          formatter={(v) => `R ${v}`}
          style={{ width: 110 }}
        />
      ),
    },
  ], [productPrices]);

  // -- ProTable columns -------------------------------------------------------

  const columns: ProColumns<Sale>[] = useMemo(() => [
    {
      title: 'Sale ID',
      dataIndex: 'trackingId',
      width: 180,
      render: (_, r) => (
        <TrackingId id={r.trackingId} size="sm" linkTo={`/sales/${r.id}`} copyable />
      ),
    },
    {
      title: 'Buyer',
      dataIndex: 'buyerName',
      width: 170,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontWeight: 500, fontSize: 13 }}>{r.buyerName}</Text>
          <Tag style={{ fontSize: 11, margin: 0, borderRadius: 4 }}>{r.buyerLicense}</Tag>
        </Space>
      ),
    },
    {
      title: 'Products',
      dataIndex: 'productSummary',
      width: 200,
      ellipsis: true,
      render: (_, r) => (
        <Text style={{ fontSize: 13, color: '#595959' }}>{r.productSummary}</Text>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'totalQuantity',
      width: 100,
      sorter: (a, b) => a.totalQuantity - b.totalQuantity,
      render: (_, r) => (
        <Text style={{ fontSize: 13 }}>{formatQuantity(r.totalQuantity, r.quantityUnit)}</Text>
      ),
    },
    {
      title: 'Value (ZAR)',
      dataIndex: 'totalValue',
      width: 120,
      sorter: (a, b) => a.totalValue - b.totalValue,
      render: (_, r) => (
        <Text strong style={{ fontSize: 13, color: '#007A4D' }}>{formatZAR(r.totalValue)}</Text>
      ),
    },
    {
      title: 'Sale Date',
      dataIndex: 'saleDate',
      width: 130,
      sorter: (a, b) => dayjs(a.saleDate).unix() - dayjs(b.saleDate).unix(),
      render: (_, r) => (
        <Text style={{ fontSize: 13 }}>{dayjs(r.saleDate).format('DD MMM YYYY')}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      filters: [
        { text: 'Completed', value: 'completed' },
        { text: 'Pending', value: 'pending' },
        { text: 'Invoiced', value: 'invoiced' },
        { text: 'Dispatched', value: 'dispatched' },
        { text: 'Draft', value: 'draft' },
        { text: 'Void', value: 'void' },
      ],
      onFilter: (val, r) => r.status === val,
      render: (_, r) => <StatusBadge status={r.status as any} size="sm" />,
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown menu={{ items: getRowMenuItems(record) }} trigger={['click']}>
          <Button type="text" size="small" icon={<MoreVertical size={16} />} />
        </Dropdown>
      ),
    },
  ], [getRowMenuItems]);

  // -- Render -----------------------------------------------------------------

  return (
    <NctsPageContainer
      title="Sales"
      subTitle={`${sales.length} sales · Total revenue: ${formatZAR(totalRevenue)}`}
      extra={
        <Space>
          <CsvExportButton data={sales} columns={CSV_COLUMNS} filename="sales-export" />
          <Button type="primary" onClick={handleOpenDrawer} icon={<Plus size={16} />}>
            <Space size={4} style={{ marginLeft: 2 }}>
              <ShoppingCart size={14} />
              Record Sale
            </Space>
          </Button>
        </Space>
      }
    >
      <ProTable<Sale>
        actionRef={actionRef}
        columns={columns}
        dataSource={sales}
        rowKey="id"
        search={false}
        options={{ density: true, fullScreen: true, reload: true, setting: true }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} sales`,
        }}
        toolBarRender={false}
        scroll={{ x: 1200 }}
        dateFormatter="string"
        headerTitle={undefined}
      />

      {/* ------ Record Sale Drawer ------ */}
      <Drawer
        title="Record Sale"
        width={520}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCloseDrawer}>Cancel</Button>
            <Button type="primary" onClick={handleSubmit}>
              Submit Sale
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          {/* Buyer Information */}
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
            Buyer Information
          </Text>

          <Form.Item
            name="buyerLicense"
            label="Buyer License Number"
            rules={[{ required: true, message: 'License number is required' }]}
          >
            <Input
              placeholder="e.g. LIC-GP-0012"
              onChange={handleBuyerLicenseChange}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="buyerName"
            label="Buyer Name"
            rules={[{ required: true, message: 'Buyer name is required' }]}
            extra="Auto-populated from license lookup (TODO: real API)"
          >
            <Input placeholder="Will populate from license lookup" />
          </Form.Item>

          <Form.Item
            name="saleDate"
            label="Sale Date"
            rules={[{ required: true, message: 'Sale date is required' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current.isAfter(dayjs(), 'day')}
              format="DD MMM YYYY"
            />
          </Form.Item>

          <Divider style={{ margin: '16px 0' }} />

          {/* Product Selection */}
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
            Products
          </Text>

          <Table<AvailableProduct>
            dataSource={products}
            columns={productColumns}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ y: 200 }}
            rowSelection={{
              selectedRowKeys: selectedProductIds,
              onChange: (keys) => setSelectedProductIds(keys as string[]),
            }}
            style={{ marginBottom: 16 }}
          />

          {selectedProductIds.length > 0 && (
            <div
              style={{
                background: '#F6FFED',
                border: '1px solid #B7EB8F',
                borderRadius: 6,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13 }}>Subtotal</Text>
                <Text strong style={{ fontSize: 13 }}>{formatZAR(computedTotal)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: '#8C8C8C' }}>VAT (15%)</Text>
                <Text style={{ fontSize: 13, color: '#8C8C8C' }}>{formatZAR(vatAmount)}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 14 }}>Total (incl. VAT)</Text>
                <Text strong style={{ fontSize: 14, color: '#007A4D' }}>
                  {formatZAR(computedTotal + vatAmount)}
                </Text>
              </div>
            </div>
          )}

          <Divider style={{ margin: '16px 0' }} />

          {/* Payment Details */}
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
            Payment Details
          </Text>

          <Form.Item
            name="paymentMethod"
            label="Payment Method"
            rules={[{ required: true, message: 'Payment method is required' }]}
          >
            <Select placeholder="Select payment method">
              <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="eft">EFT</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="invoiceNumber" label="Invoice Number">
            <Input placeholder="e.g. INV-2026-009 (optional)" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Additional notes (optional)" />
          </Form.Item>
        </Form>
      </Drawer>
    </NctsPageContainer>
  );
}
