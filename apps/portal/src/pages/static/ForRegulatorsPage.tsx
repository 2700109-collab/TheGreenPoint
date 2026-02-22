import { Typography, Card, Row, Col, Steps, Button } from 'antd';
import { Shield, Search, FileText, MapPin, AlertTriangle, BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function ForRegulatorsPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
      <Button
        type="text"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/login')}
        style={{ marginBottom: 16, padding: '4px 8px', color: '#1B3A5C' }}
      >
        Back to Login
      </Button>

      <Title level={2}>NCTS for Regulators &amp; Inspectors</Title>
      <Paragraph style={{ fontSize: 16, color: '#555' }}>
        The NCTS Government Administration Portal provides SAHPRA regulators and
        authorised inspectors with powerful tools to monitor, audit, and enforce
        compliance across South Africa's legal cannabis industry.
      </Paragraph>

      <Title level={3} style={{ marginTop: 40 }}>Regulatory Tools</Title>
      <Row gutter={[24, 24]}>
        {[
          { icon: <BarChart3 size={28} />, title: 'National Dashboard', desc: 'Real-time overview of all licensed cannabis operations — total operators, active plants, compliance rates, and industry trends at a glance.' },
          { icon: <Search size={28} />, title: 'Operator Oversight', desc: 'View detailed profiles of all licensed operators, their facilities, permit status, compliance history, and operational data.' },
          { icon: <FileText size={28} />, title: 'Permit Management', desc: 'Review, approve, suspend, or revoke operator permits. Track pending applications and upcoming expirations.' },
          { icon: <AlertTriangle size={28} />, title: 'Compliance Monitoring', desc: 'Automated alerts for permit expirations, non-compliant operators, unusual activity patterns, and threshold breaches.' },
          { icon: <MapPin size={28} />, title: 'Facility Mapping', desc: 'Geographic visualisation of all licensed facilities across provinces with real-time status indicators.' },
          { icon: <Shield size={28} />, title: 'Inspection Management', desc: 'Schedule, conduct, and record facility inspections. Generate inspection reports and track corrective actions.' },
        ].map((item) => (
          <Col xs={24} sm={12} md={8} key={item.title}>
            <Card style={{ height: '100%' }}>
              <div style={{ color: '#1B3A5C', marginBottom: 12 }}>{item.icon}</div>
              <Text strong>{item.title}</Text>
              <Paragraph style={{ marginTop: 8, color: '#666' }}>{item.desc}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={3} style={{ marginTop: 40 }}>Reporting &amp; Compliance</Title>
      <Steps
        direction="vertical"
        current={-1}
        items={[
          { title: 'INCB Treaty Reports', description: 'Generate mandatory International Narcotics Control Board reports with accurate, auditable data from the NCTS.' },
          { title: 'Monthly Provincial Reports', description: 'Automated monthly summaries of cannabis activity by province, including production volumes, transfers, and sales.' },
          { title: 'Audit Trail', description: 'Complete, immutable audit log of every action in the system — from plant registration to sale — for forensic analysis.' },
          { title: 'Custom Reports', description: 'Build custom queries and export data for ad-hoc regulatory analysis and policy research.' },
        ]}
      />

      <Title level={3} style={{ marginTop: 40 }}>Access</Title>
      <Paragraph>
        Regulator and inspector accounts are provisioned by SAHPRA's IT Security team.
        Contact <a href="mailto:itsecurity@sahpra.gov.za">itsecurity@sahpra.gov.za</a> for
        access requests or role changes.
      </Paragraph>
    </div>
  );
}
