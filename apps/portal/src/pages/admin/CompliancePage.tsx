import { Spin, Tag } from 'antd';
import { useComplianceAlerts } from '@ncts/api-client';

const severityColors: Record<string, string> = { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#059669' };

export default function CompliancePage() {
  const { data, isLoading } = useComplianceAlerts();
  const alerts = (data as any) ?? [];

  return (
    <div>
      <div className="page-header"><h2>Compliance Monitoring</h2></div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: '3px solid #DC2626' }}>
          <div className="kpi-card-label">Critical Alerts</div>
          <div className="kpi-card-value" style={{ color: '#DC2626' }}>{alerts.filter((a: any) => a.severity === 'critical').length}</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '3px solid #D97706' }}>
          <div className="kpi-card-label">Warning Alerts</div>
          <div className="kpi-card-value" style={{ color: '#D97706' }}>{alerts.filter((a: any) => a.severity === 'medium' || a.severity === 'high').length}</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '3px solid #059669' }}>
          <div className="kpi-card-label">Resolved</div>
          <div className="kpi-card-value" style={{ color: '#059669' }}>{alerts.filter((a: any) => a.resolved).length}</div>
        </div>
      </div>

      <Spin spinning={isLoading}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.length === 0 && (
            <div className="content-card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 16, color: '#059669', fontWeight: 500 }}>✓ No compliance alerts</p>
              <p style={{ color: '#5A6B7F', fontSize: 13 }}>All operators are currently compliant</p>
            </div>
          )}
          {alerts.map((alert: any, i: number) => (
            <div key={i} className="content-card" style={{ padding: '16px 20px', borderLeft: `4px solid ${severityColors[alert.severity] ?? '#5A6B7F'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={alert.severity === 'critical' ? 'red' : alert.severity === 'high' ? 'orange' : 'gold'}>{(alert.severity ?? 'info').toUpperCase()}</Tag>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{alert.title ?? alert.type}</span>
                </div>
                <span style={{ fontSize: 12, color: '#5A6B7F' }}>{alert.operatorName}</span>
              </div>
              <p style={{ fontSize: 13, color: '#5A6B7F', margin: 0 }}>{alert.description ?? alert.message}</p>
            </div>
          ))}
        </div>
      </Spin>
    </div>
  );
}
