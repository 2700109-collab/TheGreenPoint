import { Layout, Space, Avatar, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Text } = Typography;

export default function AdminHeader() {
  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Text strong style={{ fontSize: 16 }}>
        Regulatory Dashboard — SAHPRA
      </Text>
      <Space>
        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#722ed1' }} />
        <Text>Gov. Inspector</Text>
      </Space>
    </Header>
  );
}
