import { Typography, Card, Row, Col, Button } from 'antd';
import { Shield, Target, Eye, Users, Scale, Globe, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function AboutPage() {
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

      <Title level={2}>About NCTS</Title>
      <Paragraph style={{ fontSize: 16, color: '#555' }}>
        The <strong>National Cannabis Tracking System (NCTS)</strong> is South Africa's
        official digital platform for seed-to-sale tracking of all legal cannabis
        products. Operated under the authority of <strong>SAHPRA</strong> (South African
        Health Products Regulatory Authority), the NCTS ensures complete
        traceability, regulatory compliance, and public safety across the
        cannabis value chain.
      </Paragraph>

      <Title level={3} style={{ marginTop: 40 }}>Our Mission</Title>
      <Row gutter={[24, 24]}>
        {[
          { icon: <Shield size={28} />, title: 'Public Safety', desc: 'Ensure every cannabis product sold in South Africa meets rigorous safety and quality standards.' },
          { icon: <Target size={28} />, title: 'Traceability', desc: 'Track every plant from seed to sale with unique identifiers and real-time monitoring.' },
          { icon: <Eye size={28} />, title: 'Transparency', desc: 'Provide regulators and the public with verifiable data on all licensed cannabis operations.' },
          { icon: <Users size={28} />, title: 'Industry Support', desc: 'Empower licensed operators with digital tools to manage compliance efficiently.' },
          { icon: <Scale size={28} />, title: 'Regulatory Compliance', desc: 'Align with SAHPRA regulations, the Cannabis for Private Purposes Act, and international standards.' },
          { icon: <Globe size={28} />, title: 'INCB Reporting', desc: 'Generate reports required by the International Narcotics Control Board for treaty compliance.' },
        ].map((item) => (
          <Col xs={24} sm={12} md={8} key={item.title}>
            <Card hoverable style={{ height: '100%' }}>
              <div style={{ color: '#1B3A5C', marginBottom: 12 }}>{item.icon}</div>
              <Text strong>{item.title}</Text>
              <Paragraph style={{ marginTop: 8, color: '#666' }}>{item.desc}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={3} style={{ marginTop: 40 }}>Contact</Title>
      <Paragraph>
        <strong>SAHPRA — Cannabis Tracking Division</strong><br />
        Email: <a href="mailto:ncts@sahpra.gov.za">ncts@sahpra.gov.za</a><br />
        Helpline: <a href="tel:08006287">0800-NCTS (6287)</a><br />
        Address: 123 Protea Avenue, Government Precinct, Pretoria, 0001
      </Paragraph>
    </div>
  );
}
