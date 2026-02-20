import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import AppSider from './components/layout/AppSider';
import AppHeader from './components/layout/AppHeader';
import DashboardPage from './pages/DashboardPage';
import FacilitiesPage from './pages/FacilitiesPage';
import PlantsPage from './pages/PlantsPage';
import HarvestsPage from './pages/HarvestsPage';
import TransfersPage from './pages/TransfersPage';

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppSider />
      <Layout>
        <AppHeader />
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: 8 }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/facilities" element={<FacilitiesPage />} />
            <Route path="/plants" element={<PlantsPage />} />
            <Route path="/harvests" element={<HarvestsPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
