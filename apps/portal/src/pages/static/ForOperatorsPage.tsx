import { Typography, Card, Row, Col, Steps, Button } from 'antd';
import { Building2, Sprout, FlaskConical, Truck, ShoppingCart, BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function ForOperatorsPage() {
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

      <Title level={2}>NCTS for Licensed Operators</Title>
      <Paragraph style={{ fontSize: 16, color: '#555' }}>
        As a licensed cannabis operator in South Africa, NCTS provides you with a
        comprehensive digital portal to manage your cultivation, processing, and
        distribution operations while maintaining full regulatory compliance.
      </Paragraph>

      <Title level={3} style={{ marginTop: 40 }}>Your Operator Dashboard</Title>
      <Paragraph>
        Once registered and approved by SAHPRA, you gain access to the Operator Portal
        where you can manage every aspect of your licensed cannabis operation:
      </Paragraph>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {[
          { icon: <Building2 size={28} />, title: 'Facility Management', desc: 'Register and manage your cultivation, processing, and storage facilities. Each facility is geo-tagged with GPS coordinates for regulatory oversight.' },
          { icon: <Sprout size={28} />, title: 'Plant Tracking', desc: 'Register every plant from seed to sale. Each plant receives a unique NCTS tracking ID and its lifecycle is monitored through all growth stages.' },
          { icon: <FlaskConical size={28} />, title: 'Lab Results', desc: 'View and manage lab test results for your batches. THC/CBD content, pesticides, heavy metals, and microbial tests are all recorded.' },
          { icon: <Truck size={28} />, title: 'Transfers', desc: 'Initiate and track product transfers between licensed facilities with full chain-of-custody documentation.' },
          { icon: <ShoppingCart size={28} />, title: 'Sales Recording', desc: 'Record all sales transactions with batch traceability. Each sale is linked to verified lab results and product history.' },
          { icon: <BarChart3 size={28} />, title: 'Compliance Dashboard', desc: 'Monitor your compliance status in real-time. View upcoming permit renewals, inspection schedules, and reporting deadlines.' },
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

      <Title level={3} style={{ marginTop: 40 }}>Getting Started</Title>
      <Steps
        direction="vertical"
        current={-1}
        items={[
          { title: 'Obtain Your Licence', description: 'Secure a SAHPRA Section 22A permit or DTIC cannabis licence for your operation.' },
          { title: 'Register on NCTS', description: 'Contact SAHPRA at ncts@sahpra.gov.za with your permit details to receive your operator credentials.' },
          { title: 'Set Up Your Facilities', description: 'Register all cultivation, processing, and storage facilities in the portal with GPS coordinates.' },
          { title: 'Begin Tracking', description: 'Start registering plants, recording harvests, submitting lab samples, and managing transfers.' },
        ]}
      />

      <Title level={3} style={{ marginTop: 40 }}>Support</Title>
      <Paragraph>
        <strong>Operator Helpdesk</strong><br />
        Email: <a href="mailto:operators@sahpra.gov.za">operators@sahpra.gov.za</a><br />
        Helpline: <a href="tel:08006287">0800-NCTS (6287)</a><br />
        Hours: Monday–Friday, 08:00–17:00 SAST
      </Paragraph>
    </div>
  );
}
