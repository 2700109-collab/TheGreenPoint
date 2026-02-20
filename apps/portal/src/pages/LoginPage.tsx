import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Divider } from 'antd';
import { LockOutlined, MailOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  if (user) {
    const dest = user.role === 'regulator' || user.role === 'inspector' ? '/admin' : '/operator';
    navigate(dest, { replace: true });
    return null;
  }

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Signed in successfully');
      // Navigate based on role — will be determined by App after auth state updates
    } catch (err: any) {
      message.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (type: 'operator' | 'admin') => {
    const creds = type === 'operator'
      ? { email: 'operator@greenpoint.co.za', password: 'GreenPoint2026!' }
      : { email: 'admin@sahpra.gov.za', password: 'SAHPRA2026!' };
    handleLogin(creds);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <span className="login-coat-of-arms">🌿</span>
          <div className="login-title">National Cannabis Tracking System</div>
          <div className="login-subtitle">Republic of South Africa — Seed-to-Sale Digital Infrastructure</div>
        </div>

        <div className="login-card">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A2332', margin: '0 0 4px' }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: '#5A6B7F', margin: 0 }}>Sign in to access your portal</p>
          </div>

          <Form layout="vertical" onFinish={handleLogin} size="large" requiredMark={false}>
            <Form.Item name="email" rules={[{ required: true, message: 'Enter your email' }]}>
              <Input prefix={<MailOutlined style={{ color: '#A0A8B4' }} />} placeholder="Email address" />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#A0A8B4' }} />} placeholder="Password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" block loading={loading}
                style={{ height: 46, fontSize: 15, fontWeight: 600, background: '#003B5C' }}>
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Divider plain style={{ fontSize: 12, color: '#A0A8B4' }}>Quick Access Demo</Divider>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button block onClick={() => fillDemo('operator')} loading={loading}
              style={{ height: 42, borderColor: '#003B5C', color: '#003B5C', fontWeight: 500 }}>
              🌿 Operator Portal
            </Button>
            <Button block onClick={() => fillDemo('admin')} loading={loading}
              style={{ height: 42, borderColor: '#7C3AED', color: '#7C3AED', fontWeight: 500 }}>
              🏛️ Gov Admin Portal
            </Button>
          </div>
        </div>

        <div className="login-demo-info">
          <h4>Demo Credentials</h4>
          <p>
            <strong>Operator:</strong> <code>operator@greenpoint.co.za</code> / <code>GreenPoint2026!</code><br />
            <strong>Government:</strong> <code>admin@sahpra.gov.za</code> / <code>SAHPRA2026!</code>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Button type="link" icon={<GlobalOutlined />} onClick={() => navigate('/verify')}
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Access Public Verification Portal
          </Button>
        </div>

        <div className="login-footer">
          © 2026 National Cannabis Tracking System — Republic of South Africa
        </div>
      </div>
    </div>
  );
}
