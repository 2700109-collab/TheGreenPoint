import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import AdminSider from './components/layout/AdminSider';
import AdminHeader from './components/layout/AdminHeader';
import NationalDashboard from './pages/NationalDashboard';
import OperatorsPage from './pages/OperatorsPage';
import PermitsPage from './pages/PermitsPage';
import PermitDetailPage from './pages/PermitDetailPage';
import CompliancePage from './pages/CompliancePage';
import FacilitiesMapPage from './pages/FacilitiesMapPage';

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AdminSider />
      <Layout>
        <AdminHeader />
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: 8 }}>
          <Routes>
            <Route path="/" element={<NationalDashboard />} />
            <Route path="/operators" element={<OperatorsPage />} />
            <Route path="/permits" element={<PermitsPage />} />
            <Route path="/permits/:id" element={<PermitDetailPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/facilities-map" element={<FacilitiesMapPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
