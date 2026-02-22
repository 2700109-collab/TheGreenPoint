import { Typography, Collapse } from 'antd';

const { Title, Paragraph, Text } = Typography;

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <Title level={2}>POPIA Privacy Notice</Title>
      <Paragraph type="secondary">
        Last updated: 1 February 2026 &nbsp;|&nbsp; Effective: 1 February 2026
      </Paragraph>

      <Paragraph>
        This Privacy Notice explains how the <strong>National Cannabis Tracking System
        (NCTS)</strong>, operated by <strong>SAHPRA</strong> (South African Health Products
        Regulatory Authority), collects, uses, stores, and protects personal information
        in accordance with the <strong>Protection of Personal Information Act 4 of 2013
        (POPIA)</strong>.
      </Paragraph>

      <Collapse
        defaultActiveKey={['1']}
        items={[
          {
            key: '1',
            label: '1. Responsible Party',
            children: (
              <Paragraph>
                The responsible party for the processing of personal information is
                SAHPRA, located at CSIR Campus, Meiring Naudé Road, Brummeria,
                Pretoria, 0001. Contact: <a href="mailto:privacy@sahpra.gov.za">privacy@sahpra.gov.za</a>
              </Paragraph>
            ),
          },
          {
            key: '2',
            label: '2. Personal Information Collected',
            children: (
              <>
                <Paragraph>We collect the following personal information:</Paragraph>
                <ul>
                  <li>Full name, email address, and contact details of licensed operators and their staff</li>
                  <li>South African Identity Numbers for transfer driver verification</li>
                  <li>Business registration details, BEE levels, and tax numbers</li>
                  <li>Facility location data (GPS coordinates, addresses)</li>
                  <li>Login credentials (hashed passwords) and session data</li>
                  <li>Audit trail data (actions performed, IP addresses, timestamps)</li>
                </ul>
              </>
            ),
          },
          {
            key: '3',
            label: '3. Purpose of Processing',
            children: (
              <ul>
                <li>Regulatory compliance with the Cannabis for Private Purposes Act</li>
                <li>Seed-to-sale tracking of licensed cannabis products</li>
                <li>Permit and licence management</li>
                <li>Public safety verification of product authenticity</li>
                <li>INCB treaty reporting obligations</li>
                <li>Compliance monitoring and inspection management</li>
              </ul>
            ),
          },
          {
            key: '4',
            label: '4. Legal Basis',
            children: (
              <Paragraph>
                Processing is conducted under Section 11 of POPIA: (a) consent of the
                data subject upon registration; (c) compliance with a legal obligation
                under the Cannabis for Private Purposes Act; and (d) for the legitimate
                interests of public health and safety.
              </Paragraph>
            ),
          },
          {
            key: '5',
            label: '5. Data Retention',
            children: (
              <Paragraph>
                Personal information is retained for the duration of the licence period
                plus <strong>7 years</strong> after expiry, in compliance with the National
                Archives Act and SAHPRA record-keeping requirements. Audit trail data
                is retained indefinitely for regulatory purposes.
              </Paragraph>
            ),
          },
          {
            key: '6',
            label: '6. Your Rights',
            children: (
              <ul>
                <li>Right to access your personal information (Section 23)</li>
                <li>Right to correction of inaccurate information (Section 24)</li>
                <li>Right to object to processing (Section 11(3))</li>
                <li>Right to lodge a complaint with the Information Regulator</li>
              </ul>
            ),
          },
          {
            key: '7',
            label: '7. Security Measures',
            children: (
              <Paragraph>
                All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
                Access is controlled via role-based permissions with multi-factor
                authentication. All sensitive data fields are encrypted at the
                application level. Regular security audits are conducted.
              </Paragraph>
            ),
          },
        ]}
      />

      <Title level={4} style={{ marginTop: 32 }}>Information Regulator Contact</Title>
      <Paragraph>
        <Text strong>The Information Regulator (South Africa)</Text><br />
        JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001<br />
        Email: <a href="mailto:enquiries@inforegulator.org.za">enquiries@inforegulator.org.za</a><br />
        Tel: 010 023 5200
      </Paragraph>
    </div>
  );
}
