import { Typography, Collapse, Button } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <Button
        type="text"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/login')}
        style={{ marginBottom: 16, padding: '4px 8px', color: '#1B3A5C' }}
      >
        Back to Login
      </Button>

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
                SAHPRA, located at 123 Protea Avenue, Government Precinct,
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
                <div style={{ paddingLeft: 16 }}>
                  <Paragraph style={{ marginBottom: 4 }}>• Full name, email address, and contact details of licensed operators and their staff</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• South African Identity Numbers for transfer driver verification</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Business registration details, BEE levels, and tax numbers</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Facility location data (GPS coordinates, addresses)</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Login credentials (hashed passwords) and session data</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Audit trail data (actions performed, IP addresses, timestamps)</Paragraph>
                </div>
              </>
            ),
          },
          {
            key: '3',
            label: '3. Purpose of Processing',
            children: (
              <div style={{ paddingLeft: 16 }}>
                <Paragraph style={{ marginBottom: 4 }}>• Regulatory compliance with the Cannabis for Private Purposes Act</Paragraph>
                <Paragraph style={{ marginBottom: 4 }}>• Seed-to-sale tracking of licensed cannabis products</Paragraph>
                <Paragraph style={{ marginBottom: 4 }}>• Permit and licence management</Paragraph>
                <Paragraph style={{ marginBottom: 4 }}>• Public safety verification of product authenticity</Paragraph>
                <Paragraph style={{ marginBottom: 4 }}>• INCB treaty reporting obligations</Paragraph>
                <Paragraph style={{ marginBottom: 4 }}>• Compliance monitoring and inspection management</Paragraph>
              </div>
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
              <div style={{ paddingLeft: 16 }}>
                <Paragraph style={{ marginBottom: 4 }}>• Right to access your personal information (Section 23)</Paragraph>
                <Paragraph style={{ marginBottom: 4 }}>• Right to correction of inaccurate information (Section 24)</Paragraph>
                <Paragraph style={{ marginBottom: 4 }}>• Right to object to processing (Section 11(3))</Paragraph>
                <Paragraph style={{ marginBottom: 4 }}>• Right to lodge a complaint with the Information Regulator</Paragraph>
              </div>
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
