import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Result, Progress, Typography } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useResetPassword } from '@ncts/api-client';

const { Title, Text } = Typography;

const NAVY = '#1B3A5C';

function calcStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score += 15;
  if (pw.length >= 12) score += 15;
  if (pw.length >= 16) score += 10;
  if (/[a-z]/.test(pw)) score += 15;
  if (/[A-Z]/.test(pw)) score += 15;
  if (/\d/.test(pw)) score += 15;
  if (/[^a-zA-Z\d]/.test(pw)) score += 15;
  return Math.min(100, score);
}

function strengthLabel(score: number): string {
  if (score < 25) return 'Weak';
  if (score < 50) return 'Fair';
  if (score < 75) return 'Strong';
  return 'Very Strong';
}

function strengthColor(score: number): string {
  if (score < 25) return '#f5222d';
  if (score < 50) return '#fa8c16';
  if (score < 75) return '#52c41a';
  return '#13c2c2';
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);

  const resetPassword = useResetPassword();

  const strength = useMemo(() => calcStrength(password), [password]);

  if (!token) {
    return (
      <>
        <Result
          status="error"
          title="Invalid Reset Link"
          subTitle="This password reset link is invalid or has expired. Please request a new one."
          extra={
            <Link to="/forgot-password">
              <Button type="primary" size="large" style={{ background: NAVY }}>
                Request New Link
              </Button>
            </Link>
          }
        />
      </>
    );
  }

  const handleSubmit = (values: { password: string; confirm: string }) => {
    // TODO: useResetPassword handles the API call; if additional UX logic is needed, extend here
    resetPassword.mutate(
      { token: token!, password: values.password },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => navigate('/login?reason=password-reset'), 2000);
        },
      },
    );
  };

  if (done) {
    return (
      <>
        <Result
          status="success"
          title="Password Reset Successfully"
          subTitle="Redirecting to sign in..."
        />
      </>
    );
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: '0 0 4px', color: NAVY, fontWeight: 700 }}>
          Set New Password
        </Title>
        <Text type="secondary">Choose a strong password for your account</Text>
      </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            padding: '32px 28px',
          }}
        >
          <Form layout="vertical" onFinish={handleSubmit} size="large" requiredMark={false}>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Enter a new password' },
                { min: 12, message: 'Minimum 12 characters' },
                {
                  validator: (_, val) => {
                    if (!val) return Promise.resolve();
                    if (!/[a-z]/.test(val)) return Promise.reject('Must include a lowercase letter');
                    if (!/[A-Z]/.test(val)) return Promise.reject('Must include an uppercase letter');
                    if (!/\d/.test(val)) return Promise.reject('Must include a digit');
                    if (!/[^a-zA-Z\d]/.test(val)) return Promise.reject('Must include a special character');
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#A0A8B4' }} />}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>

            {password && (
              <div style={{ marginBottom: 16, marginTop: -8 }}>
                <Progress
                  percent={strength}
                  showInfo={false}
                  strokeColor={strengthColor(strength)}
                  size="small"
                />
                <Text style={{ fontSize: 12, color: strengthColor(strength) }}>
                  {strengthLabel(strength)}
                </Text>
              </div>
            )}

            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject('Passwords do not match');
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#A0A8B4' }} />}
                placeholder="Confirm new password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={resetPassword.isPending}
                style={{ height: 48, fontWeight: 600, background: NAVY }}
              >
                Reset Password
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ color: NAVY, fontSize: 14 }}>
            <ArrowLeftOutlined style={{ marginRight: 6 }} />
            Back to sign in
          </Link>
        </div>
    </>
  );
}
