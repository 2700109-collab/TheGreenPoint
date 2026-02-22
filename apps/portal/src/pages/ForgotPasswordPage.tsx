import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Result, Typography, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useForgotPassword } from '@ncts/api-client';

const { Title, Text } = Typography;

const NAVY = '#1B3A5C';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate, isPending } = useForgotPassword();

  const handleSubmit = (values: { email: string }) => {
    mutate(values.email, {
      onSuccess: () => {
        setSubmitted(true);
      },
      onError: () => {
        // Always show success to avoid email enumeration attacks
        setSubmitted(true);
        message.info('If an account exists, a reset link has been sent.');
      },
    });
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: '0 0 4px', color: NAVY, fontWeight: 700 }}>
          {submitted ? 'Check Your Email' : 'Reset Your Password'}
        </Title>
        {!submitted && (
          <Text type="secondary">
            Enter your email and we&apos;ll send you a reset link
          </Text>
        )}
      </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            padding: '32px 28px',
          }}
        >
          {submitted ? (
            <Result
              status="success"
              title="Check your email"
              subTitle="If an account exists with that email, a reset link has been sent. Please check your inbox and spam folder."
              extra={
                <Link to="/login">
                  <Button type="primary" size="large" style={{ background: NAVY }}>
                    Back to Sign In
                  </Button>
                </Link>
              }
            />
          ) : (
            <Form layout="vertical" onFinish={handleSubmit} size="large" requiredMark={false}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Enter your email' },
                  { type: 'email', message: 'Enter a valid email' },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#A0A8B4' }} />}
                  placeholder="Email address"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={isPending}
                  style={{ height: 48, fontWeight: 600, background: NAVY }}
                >
                  Send Reset Link
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>

        {!submitted && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" style={{ color: NAVY, fontSize: 14 }}>
              <ArrowLeftOutlined style={{ marginRight: 6 }} />
              Back to sign in
            </Link>
          </div>
        )}
    </>
  );
}
