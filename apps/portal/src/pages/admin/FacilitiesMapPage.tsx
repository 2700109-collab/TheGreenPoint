import { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Tag,
  Table,
  Typography,
  Input,
  Button,
  Segmented,
  Space,
  Badge,
  Descriptions,
  Progress,
} from 'antd';
import { Search, X } from 'lucide-react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { StatusBadge, NctsPageContainer, DataFreshness } from '@ncts/ui';

const { Text } = Typography;

/* ---------------------------------------------------------------------------
 * Constants
 * -------------------------------------------------------------------------*/

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
] as const;

const FACILITY_TYPES = ['cultivation', 'processing', 'distribution', 'retail'] as const;
const STATUSES = ['active', 'inactive', 'suspended'] as const;

const TYPE_COLORS: Record<string, string> = {
  cultivation: 'green',
  processing: 'blue',
  distribution: 'orange',
  retail: 'purple',
};

const PROVINCE_COLORS: Record<string, string> = {
  'Eastern Cape': '#1677ff',
  'Free State': '#fa8c16',
  Gauteng: '#52c41a',
  'KwaZulu-Natal': '#eb2f96',
  Limpopo: '#722ed1',
  Mpumalanga: '#13c2c2',
  'North West': '#faad14',
  'Northern Cape': '#f5222d',
  'Western Cape': '#2f54eb',
};

/* ---------------------------------------------------------------------------
 * Mock Data — TODO: Replace with real API data from useFacilitiesGeo()
 * -------------------------------------------------------------------------*/

interface MockFacility {
  id: string;
  name: string;
  type: (typeof FACILITY_TYPES)[number];
  operator: string;
  province: string;
  plants: number;
  status: 'active' | 'inactive' | 'suspended';
  compliance: number;
  lastInspection: string;
  lat: number;
  lng: number;
}

// TODO: Replace with live API call — these are placeholder records
const MOCK_FACILITIES: MockFacility[] = [
  { id: 'FAC-001', name: 'GreenLeaf Farm', type: 'cultivation', operator: 'GreenLeaf Holdings', province: 'Western Cape', plants: 1240, status: 'active', compliance: 96, lastInspection: '2026-01-15', lat: -33.92, lng: 18.42 },
  { id: 'FAC-002', name: 'Cape Extract Lab', type: 'processing', operator: 'Cape Extracts (Pty) Ltd', province: 'Western Cape', plants: 0, status: 'active', compliance: 88, lastInspection: '2026-02-01', lat: -33.96, lng: 18.46 },
  { id: 'FAC-003', name: 'Highveld Grow Co', type: 'cultivation', operator: 'Highveld Agri', province: 'Gauteng', plants: 870, status: 'active', compliance: 91, lastInspection: '2025-12-20', lat: -26.20, lng: 28.04 },
  { id: 'FAC-004', name: 'Durban Distro Hub', type: 'distribution', operator: 'KZN Logistics', province: 'KwaZulu-Natal', plants: 0, status: 'active', compliance: 100, lastInspection: '2026-01-28', lat: -29.86, lng: 31.02 },
  { id: 'FAC-005', name: 'Limpopo Fields', type: 'cultivation', operator: 'Northern Growers', province: 'Limpopo', plants: 2100, status: 'active', compliance: 78, lastInspection: '2025-11-10', lat: -23.90, lng: 29.44 },
  { id: 'FAC-006', name: 'Bloemfontein Retail', type: 'retail', operator: 'Free State Wellness', province: 'Free State', plants: 0, status: 'inactive', compliance: 65, lastInspection: '2025-09-05', lat: -29.12, lng: 26.21 },
  { id: 'FAC-007', name: 'Mpumalanga Processing', type: 'processing', operator: 'Lowveld Pharma', province: 'Mpumalanga', plants: 0, status: 'active', compliance: 93, lastInspection: '2026-02-10', lat: -25.47, lng: 30.97 },
  { id: 'FAC-008', name: 'EC Nursery', type: 'cultivation', operator: 'Eastern Green Co', province: 'Eastern Cape', plants: 560, status: 'suspended', compliance: 42, lastInspection: '2025-08-18', lat: -33.96, lng: 25.60 },
  { id: 'FAC-009', name: 'NW Distribution', type: 'distribution', operator: 'Platinum Logistics', province: 'North West', plants: 0, status: 'active', compliance: 87, lastInspection: '2026-01-05', lat: -25.67, lng: 27.24 },
  { id: 'FAC-010', name: 'Northern Cape Farm', type: 'cultivation', operator: 'Karoo Cultivators', province: 'Northern Cape', plants: 340, status: 'active', compliance: 82, lastInspection: '2025-12-12', lat: -28.74, lng: 24.76 },
  { id: 'FAC-011', name: 'Joburg Retail', type: 'retail', operator: 'Urban Leaf Co', province: 'Gauteng', plants: 0, status: 'active', compliance: 95, lastInspection: '2026-02-14', lat: -26.21, lng: 28.05 },
  { id: 'FAC-012', name: 'Pretoria Processing', type: 'processing', operator: 'Jacaranda Pharma', province: 'Gauteng', plants: 0, status: 'active', compliance: 90, lastInspection: '2026-01-22', lat: -25.75, lng: 28.19 },
  { id: 'FAC-013', name: 'KZN Cultivation', type: 'cultivation', operator: 'Zulu Grow Holdings', province: 'KwaZulu-Natal', plants: 1580, status: 'active', compliance: 84, lastInspection: '2025-12-30', lat: -29.60, lng: 30.38 },
  { id: 'FAC-014', name: 'Stellenbosch Retail', type: 'retail', operator: 'Winelands Wellness', province: 'Western Cape', plants: 0, status: 'active', compliance: 97, lastInspection: '2026-02-18', lat: -33.93, lng: 18.86 },
  { id: 'FAC-015', name: 'Polokwane Distro', type: 'distribution', operator: 'Northern Logistics', province: 'Limpopo', plants: 0, status: 'inactive', compliance: 71, lastInspection: '2025-10-25', lat: -23.91, lng: 29.45 },
];

/* ---------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------*/

function complianceColor(pct: number): string {
  if (pct >= 90) return '#52c41a';
  if (pct >= 70) return '#faad14';
  return '#f5222d';
}

/* ---------------------------------------------------------------------------
 * Component
 * -------------------------------------------------------------------------*/

export default function FacilitiesMapPage() {
  /* ---- filter state ---- */
  const [search, setSearch] = useState('');
  const [provinces, setProvinces] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [colorMode, setColorMode] = useState<string>('Status');
  const [selectedFacility, setSelectedFacility] = useState<MockFacility | null>(MOCK_FACILITIES[0] ?? null);

  // TODO: Replace with API query once backend is wired up
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_FACILITIES.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q) && !f.operator.toLowerCase().includes(q)) return false;
      if (provinces.length && !provinces.includes(f.province)) return false;
      if (types.length && !types.includes(f.type)) return false;
      if (statuses.length && !statuses.includes(f.status)) return false;
      return true;
    });
  }, [search, provinces, types, statuses]);

  const provinceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SA_PROVINCES.forEach((p) => (counts[p] = 0));
    filtered.forEach((f) => { counts[f.province] = (counts[f.province] || 0) + 1; });
    return counts;
  }, [filtered]);

  const clearFilters = () => {
    setSearch('');
    setProvinces([]);
    setTypes([]);
    setStatuses([]);
  };

  const hasFilters = search || provinces.length || types.length || statuses.length;

  /* ---- table columns ---- */
  const columns = [
    {
      title: 'Facility',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (_: string, r: MockFacility) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
          <Tag color={TYPE_COLORS[r.type]} style={{ margin: 0, fontSize: 11 }}>
            {r.type}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Operator',
      dataIndex: 'operator',
      key: 'operator',
      width: 180,
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Province',
      dataIndex: 'province',
      key: 'province',
      width: 120,
    },
    {
      title: 'Plants',
      dataIndex: 'plants',
      key: 'plants',
      width: 80,
      render: (v: number) => <Text>{v.toLocaleString()}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => <StatusBadge status={s as any} size="sm" />,
    },
    {
      title: 'Compliance',
      key: 'compliance',
      width: 100,
      render: (_: unknown, r: MockFacility) => (
        <Progress
          percent={r.compliance}
          size="small"
          strokeColor={complianceColor(r.compliance)}
          format={(pct) => `${pct}%`}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, r: MockFacility) => (
        // TODO: Link to real facility detail route
        <Link to={`/facilities/${r.id}`}>
          <Button type="link" size="small">View</Button>
        </Link>
      ),
    },
  ];

  /* ---- render ---- */
  return (
    <NctsPageContainer
      title="Facilities Map"
      subTitle="Geographic overview of all registered facilities"
      extra={
        // TODO: Wire lastUpdated to real query timestamp
        <DataFreshness lastUpdated={new Date().toISOString()} onRefresh={() => {}} />
      }
    >
      {/* ── §1 Filter Bar ───────────────────────────────────────────────── */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <Input
              placeholder="Search facility or operator..."
              prefix={<Search size={14} style={{ color: '#bfbfbf' }} />}
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              mode="multiple"
              placeholder="Province"
              style={{ width: '100%' }}
              maxTagCount="responsive"
              value={provinces}
              onChange={setProvinces}
              options={SA_PROVINCES.map((p) => ({ label: p, value: p }))}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              mode="multiple"
              placeholder="Type"
              style={{ width: '100%' }}
              maxTagCount="responsive"
              value={types}
              onChange={setTypes}
              options={FACILITY_TYPES.map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))}
            />
          </Col>
          <Col xs={12} md={3}>
            <Select
              mode="multiple"
              placeholder="Status"
              style={{ width: '100%' }}
              maxTagCount="responsive"
              value={statuses}
              onChange={setStatuses}
              options={STATUSES.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
            />
          </Col>
          <Col xs={12} md={4}>
            <Segmented
              options={['Status', 'Compliance']}
              value={colorMode}
              onChange={(v) => setColorMode(v as string)}
            />
          </Col>
          <Col xs={24} md={3} style={{ textAlign: 'right' }}>
            {hasFilters && (
              <Button icon={<X size={14} />} size="small" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {/* ── §2 Map Placeholder ──────────────────────────────────────── */}
        <Col xs={24} lg={14}>
          <Card
            title="Map View"
            size="small"
            style={{ marginBottom: 16 }}
            extra={
              <Badge count={filtered.length} style={{ backgroundColor: '#007A4D' }} />
            }
          >
            {/* SVG-based South Africa Facility Map */}
            <div style={{ position: 'relative', height: 500, background: '#e8f4f8', borderRadius: 8, overflow: 'hidden' }}>
              {/* SA approximate bounding box: lat -22 to -35, lng 16 to 33 */}
              <svg
                viewBox="0 0 680 520"
                style={{ width: '100%', height: '100%' }}
                role="img"
                aria-label={`Map showing ${filtered.length} facilities across South Africa`}
              >
                {/* Ocean background */}
                <rect width="680" height="520" fill="#d4e9f7" />

                {/* Simplified SA land mass — approximate outline */}
                <path
                  d="M 120 40 L 280 20 L 420 25 L 540 50 L 610 100 L 640 200 L 630 300 L 580 380 L 520 430 L 440 460 L 360 480 L 300 490 L 200 470 L 140 430 L 80 360 L 50 280 L 40 200 L 60 120 Z"
                  fill="#f0f5e8"
                  stroke="#bfbfbf"
                  strokeWidth="1.5"
                />

                {/* Province boundaries — approximate */}
                {/* Western Cape */}
                <path d="M 80 360 L 140 430 L 200 470 L 240 440 L 220 380 L 160 340 Z" fill="#e8f5e9" stroke="#a5d6a7" strokeWidth="0.8" opacity="0.6" />
                {/* Eastern Cape */}
                <path d="M 240 440 L 360 480 L 420 440 L 380 380 L 300 380 L 220 380 Z" fill="#e3f2fd" stroke="#90caf9" strokeWidth="0.8" opacity="0.6" />
                {/* KZN */}
                <path d="M 420 440 L 520 430 L 540 360 L 480 340 L 420 360 Z" fill="#fce4ec" stroke="#f48fb1" strokeWidth="0.8" opacity="0.6" />
                {/* Gauteng */}
                <path d="M 340 200 L 380 200 L 380 250 L 340 250 Z" fill="#e8f5e9" stroke="#66bb6a" strokeWidth="0.8" opacity="0.6" />
                {/* Limpopo */}
                <path d="M 340 40 L 480 50 L 540 100 L 460 160 L 360 140 L 300 80 Z" fill="#f3e5f5" stroke="#ce93d8" strokeWidth="0.8" opacity="0.6" />

                {/* Province labels */}
                <text x="170" y="420" fontSize="10" fill="#666" textAnchor="middle" fontFamily="sans-serif">W. Cape</text>
                <text x="330" y="440" fontSize="10" fill="#666" textAnchor="middle" fontFamily="sans-serif">E. Cape</text>
                <text x="470" y="400" fontSize="10" fill="#666" textAnchor="middle" fontFamily="sans-serif">KZN</text>
                <text x="360" y="235" fontSize="9" fill="#666" textAnchor="middle" fontFamily="sans-serif">GP</text>
                <text x="420" y="100" fontSize="10" fill="#666" textAnchor="middle" fontFamily="sans-serif">Limpopo</text>
                <text x="300" y="310" fontSize="10" fill="#666" textAnchor="middle" fontFamily="sans-serif">Free State</text>
                <text x="180" y="300" fontSize="10" fill="#666" textAnchor="middle" fontFamily="sans-serif">N. Cape</text>
                <text x="450" y="240" fontSize="10" fill="#666" textAnchor="middle" fontFamily="sans-serif">Mpum.</text>
                <text x="280" y="180" fontSize="10" fill="#666" textAnchor="middle" fontFamily="sans-serif">N. West</text>

                {/* Facility markers — projected from lat/lng */}
                {filtered.map((f) => {
                  // Simple Mercator projection: SA bounding box lat -22 to -35, lng 16 to 33
                  const x = ((f.lng - 16) / (33 - 16)) * 600 + 40;
                  const y = ((f.lat - (-22)) / (-35 - (-22))) * 460 + 30;
                  const markerColor = colorMode === 'Compliance'
                    ? complianceColor(f.compliance)
                    : f.status === 'active' ? '#52c41a' : f.status === 'suspended' ? '#f5222d' : '#faad14';
                  const isSelected = selectedFacility?.id === f.id;
                  return (
                    <g
                      key={f.id}
                      onClick={() => setSelectedFacility(f)}
                      style={{ cursor: 'pointer' }}
                      role="button"
                      aria-label={`${f.name} — ${f.province}, ${f.status}, ${f.compliance}% compliance`}
                      tabIndex={0}
                    >
                      {isSelected && (
                        <circle cx={x} cy={y} r={12} fill={markerColor} opacity={0.2}>
                          <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 7 : 5}
                        fill={markerColor}
                        stroke="#fff"
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      {isSelected && (
                        <text x={x} y={y - 12} fontSize="9" fill="#333" textAnchor="middle" fontWeight="600" fontFamily="sans-serif">
                          {f.name}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Legend */}
                <g transform="translate(540, 440)">
                  <rect x="0" y="0" width="120" height="64" rx="4" fill="white" fillOpacity="0.9" stroke="#ddd" />
                  <text x="8" y="14" fontSize="9" fontWeight="600" fill="#333" fontFamily="sans-serif">
                    {colorMode === 'Compliance' ? 'Compliance' : 'Status'}
                  </text>
                  {colorMode === 'Compliance' ? (
                    <>
                      <circle cx="14" cy="26" r="4" fill="#52c41a" /><text x="22" y="30" fontSize="8" fill="#666" fontFamily="sans-serif">≥90%</text>
                      <circle cx="14" cy="40" r="4" fill="#faad14" /><text x="22" y="44" fontSize="8" fill="#666" fontFamily="sans-serif">70-89%</text>
                      <circle cx="14" cy="54" r="4" fill="#f5222d" /><text x="22" y="58" fontSize="8" fill="#666" fontFamily="sans-serif">&lt;70%</text>
                    </>
                  ) : (
                    <>
                      <circle cx="14" cy="26" r="4" fill="#52c41a" /><text x="22" y="30" fontSize="8" fill="#666" fontFamily="sans-serif">Active</text>
                      <circle cx="14" cy="40" r="4" fill="#faad14" /><text x="22" y="44" fontSize="8" fill="#666" fontFamily="sans-serif">Inactive</text>
                      <circle cx="14" cy="54" r="4" fill="#f5222d" /><text x="22" y="58" fontSize="8" fill="#666" fontFamily="sans-serif">Suspended</text>
                    </>
                  )}
                </g>
              </svg>
            </div>

            {/* Province summary bar */}
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SA_PROVINCES.map((p) => (
                <Tag
                  key={p}
                  color={PROVINCE_COLORS[p]}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    setProvinces((prev) =>
                      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
                    )
                  }
                >
                  {p}: {provinceCounts[p] ?? 0}
                </Tag>
              ))}
            </div>
          </Card>

          {/* ── §4 Facility Popup Card (mock) ─────────────────────────── */}
          {selectedFacility && (
            <Card
              title={selectedFacility.name}
              size="small"
              style={{ marginBottom: 16 }}
              extra={
                <Space>
                  <StatusBadge status={selectedFacility.status as any} size="sm" />
                  <Tag color={TYPE_COLORS[selectedFacility.type]}>
                    {selectedFacility.type}
                  </Tag>
                </Space>
              }
            >
              <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="Operator">{selectedFacility.operator}</Descriptions.Item>
                <Descriptions.Item label="Plants">{selectedFacility.plants.toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Compliance">
                  <Text style={{ color: complianceColor(selectedFacility.compliance), fontWeight: 600 }}>
                    {selectedFacility.compliance}%
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Last Inspection">
                  {dayjs(selectedFacility.lastInspection).format('DD MMM YYYY')}
                </Descriptions.Item>
              </Descriptions>
              {/* TODO: Link to real facility detail route */}
              <Link to={`/facilities/${selectedFacility.id}`}>
                <Button type="link" style={{ padding: 0, marginTop: 8 }}>
                  View Facility Details →
                </Button>
              </Link>
            </Card>
          )}
        </Col>

        {/* ── §3 Facility List Table ──────────────────────────────────── */}
        <Col xs={24} lg={10}>
          <Card title="Facility List" size="small">
            <Table
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8, size: 'small' }}
              scroll={{ x: 760 }}
              onRow={(record) => ({
                onClick: () => setSelectedFacility(record),
                style: {
                  cursor: 'pointer',
                  background: selectedFacility?.id === record.id ? '#e6f7ff' : undefined,
                },
              })}
            />
          </Card>
        </Col>
      </Row>
    </NctsPageContainer>
  );
}
