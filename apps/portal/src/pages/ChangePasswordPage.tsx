import { useState, useMemo } from 'react';
import { Form, Input, Button, Steps, Result, Progress, Typography, Divider } from 'antd';
import {
  LockOutlined,
  CheckCircleOutlined,
  MobileOutlined,
} from '@ant-design/icons';

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

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [done, setDone] = useState(false);

  const strength = useMemo(() => calcStrength(newPassword), [newPassword]);

  const handleCurrentPassword = (_values: { currentPassword: string }) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCurrent(1);
    }, 800);
  };

  const handleNewPassword = (_values: { password: string; confirm: string }) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCurrent(2);
    }, 800);
  };

  const handleMfaSetup = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 800);
  };

  const handleSkipMfa = () => {
    setDone(true);
  };

  if (done) {
    return (
      <>
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            padding: '40px 28px',
          }}
        >
          <Result
            status="success"
            title="Setup Complete"
            subTitle="Your password has been changed and your account is secured."
            extra={
              <Button
                type="primary"
                size="large"
                href="/operator"
                style={{ background: NAVY, fontWeight: 600 }}
              >
                Continue to Dashboard
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: '0 0 4px', color: NAVY, fontWeight: 700 }}>
          Account Setup Required
        </Title>
        <Text type="secondary">Please change your temporary password to continue</Text>
      </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            padding: '32px 28px',
          }}
        >
          <Steps
            current={current}
            size="small"
            style={{ marginBottom: 28 }}
            items={[
              { title: 'Current Password', icon: <LockOutlined /> },
              { title: 'New Password', icon: <CheckCircleOutlined /> },
              { title: 'MFA Setup', icon: <MobileOutlined /> },
            ]}
          />

          {/* Step 0: Current Password */}
          {current === 0 && (
            <Form layout="vertical" onFinish={handleCurrentPassword} size="large" requiredMark={false}>
              <Form.Item
                name="currentPassword"
                label="Temporary Password"
                rules={[{ required: true, message: 'Enter your temporary password' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#A0A8B4' }} />}
                  placeholder="Enter temporary password"
                  autoComplete="current-password"
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{ height: 48, fontWeight: 600, background: NAVY }}
              >
                Continue
              </Button>
            </Form>
          )}

          {/* Step 1: New Password */}
          {current === 1 && (
            <Form layout="vertical" onFinish={handleNewPassword} size="large" requiredMark={false}>
              <Form.Item
                name="password"
                label="New Password"
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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Form.Item>

              {newPassword && (
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
                label="Confirm New Password"
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

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{ height: 48, fontWeight: 600, background: NAVY }}
              >
                Continue
              </Button>
            </Form>
          )}

          {/* Step 2: MFA Setup */}
          {current === 2 && (
            <div>
              <Text style={{ display: 'block', marginBottom: 16, textAlign: 'center' }}>
                Scan the QR code below with your authenticator app
              </Text>

              <div
                style={{
                  width: 200,
                  height: 200,
                  border: '2px dashed #d9d9d9',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  background: '#fafafa',
                }}
              >
                <Text type="secondary" style={{ fontSize: 13, textAlign: 'center', padding: 16 }}>
                  Scan with authenticator app
                </Text>
              </div>

              <Divider style={{ margin: '16px 0' }} />

              <Text style={{ display: 'block', marginBottom: 8, textAlign: 'center', fontSize: 13 }}>
                Enter the 6-digit code to verify setup
              </Text>

              <Input
                placeholder="000000"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  textAlign: 'center',
                  fontSize: 20,
                  fontFamily: 'monospace',
                  letterSpacing: 8,
                  marginBottom: 16,
                  height: 48,
                }}
              />

              <Button
                type="primary"
                block
                loading={loading}
                onClick={handleMfaSetup}
                disabled={mfaCode.length !== 6}
                style={{ height: 48, fontWeight: 600, background: NAVY, marginBottom: 12 }}
              >
                Verify &amp; Complete Setup
              </Button>

              <div style={{ textAlign: 'center' }}>
                <Button type="link" onClick={handleSkipMfa} style={{ color: '#999', fontSize: 13 }}>
                  Skip for now
                </Button>
              </div>
            </div>
          )}
        </div>
    </>
  );
}
