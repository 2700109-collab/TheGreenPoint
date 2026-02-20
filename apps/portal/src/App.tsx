import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './contexts/AuthContext';
import { lazy, Suspense } from 'react';

// Layouts
import OperatorLayout from './components/layout/OperatorLayout';
import AdminLayout from './components/layout/AdminLayout';

// Lazy-load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OperatorDashboard = lazy(() => import('./pages/operator/DashboardPage'));
const FacilitiesPage = lazy(() => import('./pages/operator/FacilitiesPage'));
const PlantsPage = lazy(() => import('./pages/operator/PlantsPage'));
const PlantRegisterPage = lazy(() => import('./pages/operator/PlantRegisterPage'));
const HarvestsPage = lazy(() => import('./pages/operator/HarvestsPage'));
const TransfersPage = lazy(() => import('./pages/operator/TransfersPage'));
const SalesPage = lazy(() => import('./pages/operator/SalesPage'));
const LabResultsPage = lazy(() => import('./pages/operator/LabResultsPage'));
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'));
const OperatorsPage = lazy(() => import('./pages/admin/OperatorsPage'));
const PermitsPage = lazy(() => import('./pages/admin/PermitsPage'));
const CompliancePage = lazy(() => import('./pages/admin/CompliancePage'));
const VerifyHome = lazy(() => import('./pages/verify/HomePage'));
const VerifyResult = lazy(() => import('./pages/verify/VerifyPage'));

const PageSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <Spin size="large" />
  </div>
);

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageSpinner />;

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify" element={<VerifyHome />} />
        <Route path="/verify/:trackingId" element={<VerifyResult />} />

        {/* Operator Portal */}
        <Route path="/operator" element={
          <ProtectedRoute allowedRoles={['operator_admin', 'operator_staff']}>
            <OperatorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OperatorDashboard />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="plants" element={<PlantsPage />} />
          <Route path="plants/register" element={<PlantRegisterPage />} />
          <Route path="harvests" element={<HarvestsPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="lab-results" element={<LabResultsPage />} />
        </Route>

        {/* Admin (Regulator) Portal */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['regulator', 'inspector']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="operators" element={<OperatorsPage />} />
          <Route path="permits" element={<PermitsPage />} />
          <Route path="compliance" element={<CompliancePage />} />
        </Route>

        {/* Root redirect */}
        <Route path="/" element={
          user
            ? <Navigate to={user.role === 'regulator' || user.role === 'inspector' ? '/admin' : '/operator'} replace />
            : <Navigate to="/login" replace />
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
