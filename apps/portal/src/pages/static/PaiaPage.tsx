import { Typography, Collapse, Card, Button } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export default function PaiaPage() {
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

      <Title level={2}>PAIA Manual</Title>
      <Paragraph type="secondary">
        Promotion of Access to Information Act 2 of 2000 (PAIA)<br />
        Last updated: 1 February 2026
      </Paragraph>

      <Paragraph>
        This manual is published in terms of <strong>Section 14</strong> of the Promotion
        of Access to Information Act, 2000 (Act No. 2 of 2000) ("PAIA") and describes
        how to request access to records held by the <strong>National Cannabis Tracking
        System (NCTS)</strong>, operated by <strong>SAHPRA</strong> (South African Health
        Products Regulatory Authority).
      </Paragraph>

      <Collapse
        defaultActiveKey={['1']}
        style={{ marginTop: 24 }}
        items={[
          {
            key: '1',
            label: '1. Contact Details of Information Officer',
            children: (
              <Card size="small" style={{ background: '#fafafa' }}>
                <Paragraph style={{ margin: 0 }}>
                  <Text strong>Deputy Information Officer:</Text> SAHPRA Cannabis Tracking Division<br />
                  <Text strong>Address:</Text> 123 Protea Avenue, Government Precinct, Pretoria, 0001<br />
                  <Text strong>Email:</Text>{' '}
                  <a href="mailto:paia@sahpra.gov.za">paia@sahpra.gov.za</a><br />
                  <Text strong>Tel:</Text> 012 501 0300
                </Paragraph>
              </Card>
            ),
          },
          {
            key: '2',
            label: '2. Guide Published by the Information Regulator',
            children: (
              <Paragraph>
                The Information Regulator has compiled a guide in terms of Section 10 of PAIA
                to assist persons wishing to exercise their right of access to information. This
                guide is available from the Information Regulator's website at{' '}
                <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer">
                  inforegulator.org.za
                </a>{' '}
                or by contacting the Information Regulator at{' '}
                <a href="mailto:enquiries@inforegulator.org.za">enquiries@inforegulator.org.za</a>.
              </Paragraph>
            ),
          },
          {
            key: '3',
            label: '3. Records Held by NCTS',
            children: (
              <>
                <Paragraph>The following categories of records are held by NCTS:</Paragraph>
                <div style={{ paddingLeft: 16 }}>
                  <Paragraph style={{ marginBottom: 4 }}>• Licensed operator registration and permit data</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Facility information and geo-location data</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Plant tracking and lifecycle records</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Harvest and batch processing records</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Laboratory test results</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Transfer and chain-of-custody records</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Sales transaction records</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Compliance and inspection reports</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Audit trail and system logs</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• User account and authentication records</Paragraph>
                </div>
              </>
            ),
          },
          {
            key: '4',
            label: '4. How to Request Access to Records',
            children: (
              <>
                <Paragraph>
                  Requests for access to records must be submitted using the prescribed
                  PAIA request form (Form 02 — Request for Access to Record of a Public Body)
                  to the Deputy Information Officer at the address above.
                </Paragraph>
                <Paragraph>
                  The form must include:
                </Paragraph>
                <div style={{ paddingLeft: 16 }}>
                  <Paragraph style={{ marginBottom: 4 }}>• Full name and contact details of the requester</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Sufficient detail to identify the record(s) requested</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• The form of access required (inspection, copy, etc.)</Paragraph>
                  <Paragraph style={{ marginBottom: 4 }}>• Proof of identity (certified copy of ID document)</Paragraph>
                </div>
              </>
            ),
          },
          {
            key: '5',
            label: '5. Grounds for Refusal',
            children: (
              <Paragraph>
                Access to records may be refused in accordance with Chapter 4 of PAIA,
                including but not limited to: protection of personal information of third
                parties (Section 34), records held for law enforcement proceedings (Section 39),
                and records that would endanger the safety of individuals (Section 38).
                Records containing sensitive compliance investigation data may also be
                withheld under Section 44 (mandatory protection of research information).
              </Paragraph>
            ),
          },
          {
            key: '6',
            label: '6. Processing Fees',
            children: (
              <Paragraph>
                A request fee and access fee may be payable in accordance with the regulations
                prescribed under PAIA. The request fee is non-refundable. You will be notified
                of any applicable fees before the request is processed. Fee exemptions apply
                for personal requesters as provided in Section 22(8) of PAIA.
              </Paragraph>
            ),
          },
          {
            key: '7',
            label: '7. Remedies Available',
            children: (
              <Paragraph>
                If a request for access is refused, the requester may lodge a complaint with
                the Information Regulator or apply to a court for relief within 180 days of
                receiving the decision. The Information Regulator can be contacted at
                JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001, or by
                email at <a href="mailto:complaints.IR@justice.gov.za">complaints.IR@justice.gov.za</a>.
              </Paragraph>
            ),
          },
        ]}
      />
    </div>
  );
}
