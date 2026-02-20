import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'National Dashboard' },
  { key: '/operators', icon: <TeamOutlined />, label: 'Operators' },
  { key: '/permits', icon: <SafetyCertificateOutlined />, label: 'Permits' },
];

export default function AdminSider() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sider width={260} collapsible>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span style={{ color: '#FFB81C', fontSize: 18, fontWeight: 700 }}>
          🏛️ NCTS Regulatory
        </span>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
}
