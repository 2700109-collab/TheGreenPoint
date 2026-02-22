import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function CookiePolicyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <Title level={2}>Cookie Policy</Title>
      <Paragraph type="secondary">Last updated: 1 February 2026</Paragraph>

      <Paragraph>
        The NCTS uses a minimal number of cookies that are essential for the
        system to function. We do not use advertising, analytics, or third-party
        tracking cookies.
      </Paragraph>

      <Title level={4}>Essential Cookies</Title>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px' }}>Cookie</th>
            <th style={{ padding: '8px 12px' }}>Purpose</th>
            <th style={{ padding: '8px 12px' }}>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>ncts_session</td>
            <td style={{ padding: '8px 12px' }}>Maintains your login session</td>
            <td style={{ padding: '8px 12px' }}>24 hours</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>ncts_refresh</td>
            <td style={{ padding: '8px 12px' }}>Allows session renewal without re-login</td>
            <td style={{ padding: '8px 12px' }}>7 days</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>ncts_lang</td>
            <td style={{ padding: '8px 12px' }}>Stores your language preference</td>
            <td style={{ padding: '8px 12px' }}>1 year</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>ncts_cookie_consent</td>
            <td style={{ padding: '8px 12px' }}>Records your cookie acceptance</td>
            <td style={{ padding: '8px 12px' }}>1 year</td>
          </tr>
        </tbody>
      </table>

      <Title level={4}>Your Choices</Title>
      <Paragraph>
        Since all cookies used by the NCTS are strictly necessary for the system to
        function, they cannot be disabled. If you prefer not to accept cookies, you
        should not use this system — please contact SAHPRA for alternative access options.
      </Paragraph>

      <Paragraph>
        Contact: <a href="mailto:privacy@sahpra.gov.za">privacy@sahpra.gov.za</a>
      </Paragraph>
    </div>
  );
}
