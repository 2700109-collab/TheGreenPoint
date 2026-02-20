import { Spin } from 'antd';
import { useRegulatoryDashboard, useComplianceAlerts } from '@ncts/api-client';

export default function DashboardPage() {
  const { data: dash, isLoading: dl } = useRegulatoryDashboard();
  const { data: alerts, isLoading: al } = useComplianceAlerts();

  if (dl) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div>
      <div className="page-header"><h2>National Dashboard</h2></div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: '3px solid #003B5C' }}>
          <div className="kpi-card-label">Licensed Operators</div>
          <div className="kpi-card-value">{dash?.totalOperators ?? 0}</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '3px solid #007A4D' }}>
          <div className="kpi-card-label">Total Plants Tracked</div>
          <div className="kpi-card-value">{(dash?.totalPlants ?? 0).toLocaleString()}</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '3px solid #D4A843' }}>
          <div className="kpi-card-label">Active Permits</div>
          <div className="kpi-card-value">{dash?.activePermits ?? 0}</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '3px solid #059669' }}>
          <div className="kpi-card-label">Compliance Rate</div>
          <div className="kpi-card-value" style={{ color: '#059669' }}>{dash?.complianceRate ?? 0}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="content-card">
          <div className="content-card-title">Overview</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Total Facilities', value: dash?.totalFacilities ?? 0 },
              { label: 'Pending Inspections', value: dash?.pendingInspections ?? 0 },
              { label: 'Flagged Operators', value: dash?.flaggedOperators ?? 0 },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F0F2F5' }}>
                <span style={{ color: '#5A6B7F', fontSize: 13 }}>{item.label}</span>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <div className="content-card-title">Compliance Alerts</div>
          <Spin spinning={al}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(alerts as any)?.length === 0 && <p style={{ color: '#5A6B7F', fontSize: 13 }}>No active alerts</p>}
              {(alerts as any)?.slice(0, 5).map((a: any, i: number) => (
                <div key={i} style={{ padding: '10px 14px', background: a.severity === 'critical' ? '#FEF2F2' : '#FFFBEB', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 500, color: a.severity === 'critical' ? '#DC2626' : '#D97706' }}>{a.title ?? a.type}</div>
                  <div style={{ color: '#5A6B7F', fontSize: 12, marginTop: 2 }}>{a.description ?? a.message}</div>
                </div>
              ))}
            </div>
          </Spin>
        </div>
      </div>

      {dash?.recentActivity && dash.recentActivity.length > 0 && (
        <div className="content-card" style={{ marginTop: 0 }}>
          <div className="content-card-title">Recent Activity</div>
          {dash.recentActivity.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F0F2F5' }}>
              <div>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{a.description}</span>
                <span style={{ color: '#5A6B7F', fontSize: 12, marginLeft: 8 }}>— {a.operatorName}</span>
              </div>
              <span style={{ color: '#5A6B7F', fontSize: 12 }}>{new Date(a.timestamp).toLocaleDateString('en-ZA')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
