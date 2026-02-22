import { Typography, Card, Row, Col, Button, Tag } from 'antd';
import { CheckCircle, AlertCircle, MessageSquare, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function AccessibilityPage() {
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

      <Title level={2}>Accessibility Statement</Title>
      <Paragraph type="secondary">Last updated: 1 February 2026</Paragraph>

      <Card style={{ marginBottom: 32, background: '#f0f5ff', border: '1px solid #d6e4ff' }}>
        <Paragraph style={{ margin: 0, fontSize: 16 }}>
          The National Cannabis Tracking System (NCTS) is committed to ensuring digital
          accessibility for all users, including persons with disabilities. We strive
          to meet <Tag color="blue">WCAG 2.1 Level AA</Tag> standards in accordance with
          South Africa's obligations under the Constitution and the Promotion of
          Equality and Prevention of Unfair Discrimination Act (PEPUDA).
        </Paragraph>
      </Card>

      <Title level={3}>
        <CheckCircle size={22} style={{ marginRight: 8, color: '#52c41a', verticalAlign: 'middle' }} />
        Accessibility Features
      </Title>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {[
          { title: 'Semantic HTML', desc: 'Proper HTML5 structure with correct heading hierarchy for screen readers.' },
          { title: 'ARIA Support', desc: 'ARIA landmarks and labels throughout for assistive technology compatibility.' },
          { title: 'Skip Navigation', desc: 'Skip-to-content link available on every page for keyboard users.' },
          { title: 'Keyboard Navigation', desc: 'All interactive elements are fully accessible via keyboard — no mouse required.' },
          { title: 'Colour Contrast', desc: 'All text meets WCAG 2.1 AA contrast ratios (minimum 4.5:1 for normal text).' },
          { title: 'Responsive Design', desc: 'Full functionality maintained at up to 400% zoom / screen magnification.' },
          { title: 'Focus Indicators', desc: 'Visible focus outlines on all interactive elements for keyboard navigation.' },
          { title: 'Form Labels', desc: 'All form inputs have associated labels with clear validation error messages.' },
          { title: 'Alt Text', desc: 'All non-decorative images include descriptive alternative text.' },
        ].map((item) => (
          <Col xs={24} sm={12} md={8} key={item.title}>
            <Card size="small" style={{ height: '100%' }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>{item.title}</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{item.desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={3} style={{ marginTop: 40 }}>
        <AlertCircle size={22} style={{ marginRight: 8, color: '#faad14', verticalAlign: 'middle' }} />
        Known Limitations
      </Title>
      <Paragraph>
        While we strive for full accessibility, the following areas are under active improvement:
      </Paragraph>
      <Row gutter={[16, 16]}>
        {[
          { title: 'Map Visualisations', desc: 'Facility maps provide summary text but may not convey all geographic data to screen readers.' },
          { title: 'Complex Charts', desc: 'Data charts include summary descriptions, but granular data point access is being enhanced.' },
          { title: 'PDF Exports', desc: 'Generated PDF reports are being progressively updated with full accessibility tags.' },
        ].map((item) => (
          <Col xs={24} sm={8} key={item.title}>
            <Card size="small" style={{ height: '100%', borderColor: '#ffd666' }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>{item.title}</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{item.desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={3} style={{ marginTop: 40 }}>
        <MessageSquare size={22} style={{ marginRight: 8, color: '#1B3A5C', verticalAlign: 'middle' }} />
        Feedback &amp; Contact
      </Title>
      <Card style={{ marginTop: 16 }}>
        <Paragraph>
          If you experience any accessibility barriers or have suggestions for improvement,
          please contact us. All feedback is reviewed and addressed within <strong>10 working days</strong>.
        </Paragraph>
        <Paragraph style={{ margin: 0 }}>
          <Text strong>Email:</Text>{' '}
          <a href="mailto:accessibility@sahpra.gov.za">accessibility@sahpra.gov.za</a><br />
          <Text strong>Helpline:</Text>{' '}
          <a href="tel:08006287">0800-NCTS (6287)</a><br />
          <Text strong>Hours:</Text> Monday–Friday, 08:00–17:00 SAST
        </Paragraph>
      </Card>
    </div>
  );
}
