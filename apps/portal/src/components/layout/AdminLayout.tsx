import { Layout, Menu, Typography, Avatar, Dropdown, Space, Tag } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  FileProtectOutlined,
  AlertOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const navItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: 'National Dashboard' },
  { key: '/admin/operators', icon: <TeamOutlined />, label: 'Operators' },
  { key: '/admin/permits', icon: <FileProtectOutlined />, label: 'Permits' },
  { key: '/admin/compliance', icon: <AlertOutlined />, label: 'Compliance' },
];

export default function AdminLayout() {
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
          <span style={{ fontSize: 28 }}>🏛️</span>
          <div>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700, display: 'block', lineHeight: 1.2 }}>NCTS</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: 0.5 }}>Regulatory Admin</Text>
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
            <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>GOV</Tag>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>SAHPRA Official</Text>
          </div>
        </div>
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', borderBottom: `1px solid ${colors.border}`, height: 56 }}>
          <Dropdown menu={userMenu} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size={32} style={{ background: '#7C3AED' }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Avatar>
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
