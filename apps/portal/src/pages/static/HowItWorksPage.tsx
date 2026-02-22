import { Typography, Collapse, Card, Row, Col } from 'antd';
import { BarChart3, PieChart, FileText, Building2 } from 'lucide-react';

const { Title, Paragraph } = Typography;

export default function HowItWorksPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
      <Title level={2}>How NCTS Works</Title>
      <Paragraph style={{ fontSize: 16, color: '#555' }}>
        NCTS provides end-to-end digital tracking of licensed cannabis in South Africa —
        from the moment a seed is planted through cultivation, harvesting, lab testing,
        transfer, and final sale to the consumer.
      </Paragraph>

      <Title level={3} style={{ marginTop: 40 }}>The Tracking Lifecycle</Title>
      <Row gutter={[24, 24]}>
        {[
          { step: '1', icon: <Building2 size={24} />, title: 'Registration', desc: 'Licensed operators register their facilities and obtain permits through SAHPRA. Each facility is geo-tagged and assigned a unique identifier.' },
          { step: '2', icon: <FileText size={24} />, title: 'Plant Tracking', desc: 'Every plant is assigned a unique tracking ID (e.g., NCTS-ZA-2026-000001) at the seed or seedling stage. Its lifecycle is tracked through vegetative, flowering, and harvest stages.' },
          { step: '3', icon: <BarChart3 size={24} />, title: 'Lab Testing', desc: 'Batches are sent to accredited SANAS laboratories for testing. THC/CBD content, pesticides, heavy metals, and microbials are analysed and results recorded.' },
          { step: '4', icon: <PieChart size={24} />, title: 'Sale & Verification', desc: 'Before sale, products receive a QR code linking to the verification portal. Consumers can scan to confirm authenticity, view lab results, and trace the product's full history.' },
        ].map((item) => (
          <Col xs={24} sm={12} key={item.step}>
            <Card style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#1B3A5C',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16,
                }}>
                  {item.step}
                </div>
                <div style={{ color: '#1B3A5C' }}>{item.icon}</div>
              </div>
              <Title level={5}>{item.title}</Title>
              <Paragraph style={{ color: '#666' }}>{item.desc}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={3} style={{ marginTop: 40 }}>Frequently Asked Questions</Title>
      <Collapse
        items={[
          { key: '1', label: 'Who is required to use NCTS?', children: <Paragraph>All holders of SAHPRA Section 22A permits and DTIC cannabis-related licences are required to register on NCTS and report all cultivation, processing, transfer, and sale activities.</Paragraph> },
          { key: '2', label: 'How do I register as an operator?', children: <Paragraph>Contact SAHPRA at ncts@sahpra.gov.za with your permit details. After verification, you will receive operator credentials to access the portal.</Paragraph> },
          { key: '3', label: 'Can the public access NCTS?', children: <Paragraph>The public can use the Product Verification portal to verify the authenticity and compliance of cannabis products by scanning QR codes or entering tracking IDs.</Paragraph> },
          { key: '4', label: 'What data is shared publicly?', children: <Paragraph>Only product verification data is public: product name, strain, operator name, lab results (pass/fail, THC/CBD percentages), and test date. Operator business details, financial data, and personal information are never shared publicly.</Paragraph> },
          { key: '5', label: 'What happens if I fail to report?', children: <Paragraph>Non-reporting is a compliance violation that may result in warnings, licence suspension, or revocation depending on severity and frequency. SAHPRA inspectors conduct regular audits.</Paragraph> },
        ]}
      />
    </div>
  );
}
