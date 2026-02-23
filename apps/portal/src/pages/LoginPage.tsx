import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Form, Input, Button, Alert, Checkbox, Divider, Space, Typography, message } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  ExperimentOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Text } = Typography;

const NAVY = '#1B3A5C';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'error' | 'warning' | 'info'>('error');
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'expired') {
      setErrorMsg('Your session has expired. Please sign in again.');
      setErrorType('info');
    } else if (reason === 'password-reset') {
      setErrorMsg('Password reset successfully. Please sign in with your new password.');
      setErrorType('info');
    }
  }, [searchParams]);

  if (user) {
    const dest = user.role === 'regulator' || user.role === 'inspector' ? '/admin' : '/operator';
    navigate(dest, { replace: true });
    return null;
  }

  const handleLogin = async (values: { email: string; password: string; remember?: boolean }) => {
    console.log('[LOGIN-PAGE-DEBUG] handleLogin called', { email: values.email, passwordLength: values.password.length });
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(values.email, values.password);
      console.log('[LOGIN-PAGE-DEBUG] login() resolved OK');
      message.success('Signed in successfully');
    } catch (err: unknown) {
      console.error('[LOGIN-PAGE-DEBUG] login() THREW', err);
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      if (msg.toLowerCase().includes('locked')) {
        setErrorType('warning');
        setErrorMsg('Your account has been locked. Please contact an administrator.');
      } else {
        setErrorType('error');
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
      console.log('[LOGIN-PAGE-DEBUG] handleLogin finished');
    }
  };

  const fillDemo = (type: 'operator' | 'admin') => {
    const creds =
      type === 'operator'
        ? { email: 'operator@greenpoint.co.za', password: 'GreenPoint2026!' }
        : { email: 'admin@sahpra.gov.za', password: 'SAHPRA2026!' };
    form.setFieldsValue(creds);
    handleLogin(creds);
  };

  return (
    <>
      {/* Error / info region with aria-live for screen readers */}
      <div aria-live="polite" role="status">
        {errorMsg && (
          <Alert
            message={errorMsg}
            type={errorType}
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            style={{ marginBottom: 20 }}
          />
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

          <Form
            form={form}
            layout="vertical"
            onFinish={handleLogin}
            size="large"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter a valid email address' },
                { type: 'email', message: 'Please enter a valid email address' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#A0A8B4' }} />}
                placeholder="Email address"
                autoComplete="email"
                autoFocus
                aria-label="Email address"
                tabIndex={1}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Password is required' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#A0A8B4' }} />}
                placeholder="Password"
                autoComplete="current-password"
                aria-label="Password"
                tabIndex={2}
              />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox tabIndex={3}>Remember me</Checkbox>
              </Form.Item>
            </div>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                tabIndex={4}
                style={{ height: 48, fontSize: 15, fontWeight: 600, background: NAVY }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Link to="/forgot-password" tabIndex={5} style={{ color: NAVY, fontSize: 13 }}>
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Demo Access Section */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            padding: '20px 28px',
            marginTop: 16,
          }}
        >
          <Divider style={{ margin: '0 0 16px', fontSize: 12, color: '#999' }}>Demo Access</Divider>
          <Space direction="vertical" style={{ width: '100%' }} size={10}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                block
                onClick={() => fillDemo('operator')}
                loading={loading}
                icon={<ExperimentOutlined />}
                style={{ height: 42, borderColor: NAVY, color: NAVY, fontWeight: 500 }}
              >
                Operator Portal
              </Button>
              <Button
                block
                onClick={() => fillDemo('admin')}
                loading={loading}
                icon={<BankOutlined />}
                style={{ height: 42, borderColor: NAVY, color: NAVY, fontWeight: 500 }}
              >
                Gov Admin Portal
              </Button>
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
              <strong>Operator:</strong> operator@greenpoint.co.za / GreenPoint2026!
              <br />
              <strong>Government:</strong> admin@sahpra.gov.za / SAHPRA2026!
            </Text>
          </Space>
        </div>
    </>
  );
}
