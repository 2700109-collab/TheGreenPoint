import { Layout, Menu, Typography, Avatar, Dropdown, Space } from 'antd';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  PlusCircleOutlined,
  ScissorOutlined,
  SwapOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const navItems = [
  { key: '/operator', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/operator/facilities', icon: <EnvironmentOutlined />, label: 'Facilities' },
  { key: '/operator/plants', icon: <ExperimentOutlined />, label: 'Plants' },
  { key: '/operator/plants/register', icon: <PlusCircleOutlined />, label: 'Register Plants' },
  { key: '/operator/harvests', icon: <ScissorOutlined />, label: 'Harvests' },
  { key: '/operator/transfers', icon: <SwapOutlined />, label: 'Transfers' },
  { key: '/operator/sales', icon: <DollarOutlined />, label: 'Sales' },
  { key: '/operator/lab-results', icon: <SafetyCertificateOutlined />, label: 'Lab Results' },
];

export default function OperatorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: `${user?.firstName} ${user?.lastName}` },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
    },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={256} style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 28 }}>🌿</span>
          <div>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700, display: 'block', lineHeight: 1.2 }}>NCTS</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: 0.5 }}>Operator Portal</Text>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8, border: 'none' }}
        />
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.green }} />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Licensed Operator</Text>
          </div>
        </div>
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', borderBottom: `1px solid ${colors.border}`, height: 56 }}>
          <Dropdown menu={userMenu} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size={32} style={{ background: colors.navy }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Avatar>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>{user?.firstName} {user?.lastName}</Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 0, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
