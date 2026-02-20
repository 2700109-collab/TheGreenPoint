import { Spin, Alert } from 'antd';
import { useFacilities, usePlants, useTransfers } from '@ncts/api-client';

export default function DashboardPage() {
  const { data: facData, isLoading: fl } = useFacilities({ page: 1, limit: 1 });
  const { data: plantData, isLoading: pl } = usePlants({ page: 1, limit: 1 } as any);
  const { data: txData, isLoading: tl } = useTransfers({ page: 1, limit: 5 } as any);

  const loading = fl || pl || tl;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const totalFacilities = facData?.meta?.total ?? 0;
  const totalPlants = plantData?.meta?.total ?? 0;
  const totalTransfers = txData?.meta?.total ?? 0;
  const recentTransfers = txData?.data ?? [];

  return (
    <div>
      <div className="page-header">
        <h2>Operator Dashboard</h2>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-label">Total Plants</div>
          <div className="kpi-card-value">{totalPlants.toLocaleString()}</div>
          <div className="kpi-card-change positive">Tracked in system</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Active Facilities</div>
          <div className="kpi-card-value">{totalFacilities}</div>
          <div className="kpi-card-change positive">Licensed & compliant</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Total Transfers</div>
          <div className="kpi-card-value">{totalTransfers}</div>
          <div className="kpi-card-change positive">Supply chain events</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '3px solid #059669' }}>
          <div className="kpi-card-label">Compliance Status</div>
          <div className="kpi-card-value" style={{ color: '#059669', fontSize: 22 }}>Compliant</div>
          <div className="kpi-card-change positive">All permits active</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="content-card">
          <div className="content-card-title">Recent Transfers</div>
          {recentTransfers.length === 0 ? (
            <Alert message="No transfers yet" type="info" showIcon />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentTransfers.slice(0, 5).map((t: any) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F0F2F5' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 500 }}>{t.transferNumber}</div>
                    <div style={{ fontSize: 12, color: '#5A6B7F' }}>{t.status}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#5A6B7F' }}>
                    {new Date(t.initiatedAt).toLocaleDateString('en-ZA')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="content-card">
          <div className="content-card-title">Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '🌱', label: 'Register New Plants', desc: 'Add plants to tracking system', href: '/operator/plants/register' },
              { icon: '📦', label: 'View Batches', desc: 'Manage product batches', href: '/operator/plants' },
              { icon: '🔬', label: 'Lab Results', desc: 'Review test certificates', href: '/operator/lab-results' },
              { icon: '🚚', label: 'Initiate Transfer', desc: 'Start a product transfer', href: '/operator/transfers' },
            ].map((a) => (
              <a key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FAFBFC', borderRadius: 10, textDecoration: 'none', color: 'inherit', transition: 'background 0.15s' }}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1A2332' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: '#5A6B7F' }}>{a.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
