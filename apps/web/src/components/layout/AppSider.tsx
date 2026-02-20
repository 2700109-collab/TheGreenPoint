import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  PlusCircleOutlined,
  SwapOutlined,
  BarChartOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/facilities',
    icon: <EnvironmentOutlined />,
    label: 'Facilities',
  },
  {
    key: '/plants',
    icon: <ExperimentOutlined />,
    label: 'Plants',
  },
  {
    key: '/plants/register',
    icon: <PlusCircleOutlined />,
    label: 'Register Plants',
  },
  {
    key: '/harvests',
    icon: <BarChartOutlined />,
    label: 'Harvests',
  },
  {
    key: '/transfers',
    icon: <SwapOutlined />,
    label: 'Transfers',
  },
  {
    key: '/sales',
    icon: <DollarOutlined />,
    label: 'Sales',
  },
  {
    key: '/lab-results',
    icon: <SafetyCertificateOutlined />,
    label: 'Lab Results',
  },
];

export default function AppSider() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sider width={240} collapsible>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span style={{ color: '#007A4D', fontSize: 20, fontWeight: 700 }}>
          🌿 NCTS
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
