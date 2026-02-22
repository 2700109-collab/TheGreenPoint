import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function AccessibilityPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <Title level={2}>Accessibility Statement</Title>
      <Paragraph type="secondary">Last updated: 1 February 2026</Paragraph>

      <Paragraph>
        The National Cannabis Tracking System (NCTS) is committed to ensuring digital
        accessibility for all users, including persons with disabilities. We strive
        to meet <strong>WCAG 2.1 Level AA</strong> standards in accordance with
        South Africa's obligations under the Constitution and the Promotion of
        Equality and Prevention of Unfair Discrimination Act (PEPUDA).
      </Paragraph>

      <Title level={4}>Accessibility Features</Title>
      <ul>
        <li>Semantic HTML5 structure with proper heading hierarchy</li>
        <li>ARIA landmarks and labels for screen reader compatibility</li>
        <li>Skip-to-content navigation link on every page</li>
        <li>Keyboard-navigable interface — all actions accessible without a mouse</li>
        <li>Colour contrast ratios meeting WCAG 2.1 AA standards (minimum 4.5:1)</li>
        <li>Responsive design supporting screen magnification up to 400%</li>
        <li>Focus indicators visible on all interactive elements</li>
        <li>Form inputs with associated labels and error messages</li>
        <li>Alternative text for all non-decorative images</li>
      </ul>

      <Title level={4}>Known Limitations</Title>
      <Paragraph>
        While we strive for full accessibility, some areas are still being improved:
      </Paragraph>
      <ul>
        <li>Map-based facility visualisations may not be fully screen reader accessible</li>
        <li>Complex data charts provide summary text but may not convey all data points</li>
        <li>PDF exports may not be fully tagged for screen readers</li>
      </ul>

      <Title level={4}>Feedback</Title>
      <Paragraph>
        If you experience any accessibility barriers or have suggestions for
        improvement, please contact us:
      </Paragraph>
      <Paragraph>
        Email: <a href="mailto:accessibility@sahpra.gov.za">accessibility@sahpra.gov.za</a><br />
        Helpline: <a href="tel:08006287">0800-NCTS (6287)</a><br />
        All feedback is reviewed and addressed within 10 working days.
      </Paragraph>
    </div>
  );
}
