import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <Title level={2}>Terms of Use</Title>
      <Paragraph type="secondary">Last updated: 1 February 2026</Paragraph>

      <Title level={4}>1. Acceptance of Terms</Title>
      <Paragraph>
        By accessing or using the National Cannabis Tracking System (NCTS), you agree
        to be bound by these Terms of Use. If you do not agree, you must not use this
        system. NCTS is operated by SAHPRA under the authority of the Cannabis for
        Private Purposes Act.
      </Paragraph>

      <Title level={4}>2. Authorised Use</Title>
      <Paragraph>
        This system is intended exclusively for licensed cannabis operators, authorised
        regulatory officials, and the general public (for product verification only).
        You must use valid credentials and must not share your account with any
        unauthorised person.
      </Paragraph>

      <Title level={4}>3. Data Accuracy</Title>
      <Paragraph>
        All data submitted to NCTS must be accurate, complete, and current. Submitting
        false or misleading information is a criminal offence under the Cannabis for
        Private Purposes Act and may result in licence revocation, fines, or prosecution.
      </Paragraph>

      <Title level={4}>4. Prohibited Activities</Title>
      <Paragraph>
        You must not: (a) attempt to gain unauthorised access to any part of the system;
        (b) reverse-engineer, decompile, or disassemble any part of the software;
        (c) use automated tools to scrape data from the system; (d) interfere with the
        operation or security of the system.
      </Paragraph>

      <Title level={4}>5. Intellectual Property</Title>
      <Paragraph>
        All content, designs, logos, and software comprising the NCTS are the property
        of the Republic of South Africa and are protected under applicable intellectual
        property laws. The South African Coat of Arms is used under authority of the
        Government of South Africa.
      </Paragraph>

      <Title level={4}>6. Limitation of Liability</Title>
      <Paragraph>
        SAHPRA makes every effort to ensure the accuracy and availability of the NCTS.
        However, the system is provided "as is" and SAHPRA shall not be liable for any
        direct, indirect, or consequential damages arising from system downtime, data
        errors, or security incidents beyond reasonable control.
      </Paragraph>

      <Title level={4}>7. Governing Law</Title>
      <Paragraph>
        These Terms are governed by the laws of the Republic of South Africa. Any
        disputes will be subject to the jurisdiction of the High Court of South Africa,
        Gauteng Division, Pretoria.
      </Paragraph>

      <Title level={4}>8. Contact</Title>
      <Paragraph>
        For queries regarding these Terms, contact:{' '}
        <a href="mailto:legal@sahpra.gov.za">legal@sahpra.gov.za</a>
      </Paragraph>
    </div>
  );
}
