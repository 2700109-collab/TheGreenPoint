import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { useAuth } from './contexts/AuthContext';
import { lazy, Suspense, useEffect } from 'react';
import { NotFoundPage } from '@ncts/ui';

// Layouts
import OperatorLayout from './components/layout/OperatorLayout';
import AdminLayout from './components/layout/AdminLayout';
import AuthLayout from './components/layout/AuthLayout';

// ---------------------------------------------------------------------------
// Static / info pages (public)
// ---------------------------------------------------------------------------
const AboutPage = lazy(() => import('./pages/static/AboutPage'));
const HowItWorksPage = lazy(() => import('./pages/static/HowItWorksPage'));
const ForOperatorsPage = lazy(() => import('./pages/static/ForOperatorsPage'));
const ForRegulatorsPage = lazy(() => import('./pages/static/ForRegulatorsPage'));
const PrivacyPage = lazy(() => import('./pages/static/PrivacyPage'));
const PaiaPage = lazy(() => import('./pages/static/PaiaPage'));
const TermsPage = lazy(() => import('./pages/static/TermsPage'));
const AccessibilityPage = lazy(() => import('./pages/static/AccessibilityPage'));
const CookiePolicyPage = lazy(() => import('./pages/static/CookiePolicyPage'));

// ---------------------------------------------------------------------------
// Auth pages
// ---------------------------------------------------------------------------
const LoginPage = lazy(() => import('./pages/LoginPage'));
const MfaPage = lazy(() => import('./pages/MfaPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));
const ServerErrorPage = lazy(() => import('./pages/ServerErrorPage'));

// ---------------------------------------------------------------------------
// Operator pages (13)
// ---------------------------------------------------------------------------
const OperatorDashboard = lazy(() => import('./pages/operator/DashboardPage'));
const FacilitiesPage = lazy(() => import('./pages/operator/FacilitiesPage'));
const PlantsPage = lazy(() => import('./pages/operator/PlantsPage'));
const PlantRegisterPage = lazy(() => import('./pages/operator/PlantRegisterPage'));
const PlantDetailPage = lazy(() => import('./pages/operator/PlantDetailPage'));
const HarvestsPage = lazy(() => import('./pages/operator/HarvestsPage'));
const TransfersPage = lazy(() => import('./pages/operator/TransfersPage'));
const TransferDetailPage = lazy(() => import('./pages/operator/TransferDetailPage'));
const SalesPage = lazy(() => import('./pages/operator/SalesPage'));
const SaleDetailPage = lazy(() => import('./pages/operator/SaleDetailPage'));
const LabResultsPage = lazy(() => import('./pages/operator/LabResultsPage'));
const ProfilePage = lazy(() => import('./pages/operator/ProfilePage'));
const OperatorSettingsPage = lazy(() => import('./pages/operator/SettingsPage'));
const BatchesPage = lazy(() => import('./pages/operator/BatchesPage'));
const OutgoingTransfersPage = lazy(() => import('./pages/operator/OutgoingTransfersPage'));
const IncomingTransfersPage = lazy(() => import('./pages/operator/IncomingTransfersPage'));

// ---------------------------------------------------------------------------
// Admin pages (13 + 8 new)
// ---------------------------------------------------------------------------
const NationalDashboard = lazy(() => import('./pages/admin/NationalDashboard'));
const OperatorsPage = lazy(() => import('./pages/admin/OperatorsPage'));
const OperatorDetailPage = lazy(() => import('./pages/admin/OperatorDetailPage'));
const PermitsPage = lazy(() => import('./pages/admin/PermitsPage'));
const PermitDetailPage = lazy(() => import('./pages/admin/PermitDetailPage'));
const CompliancePage = lazy(() => import('./pages/admin/CompliancePage'));
const FacilitiesMapPage = lazy(() => import('./pages/admin/FacilitiesMapPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const SystemSettingsPage = lazy(() => import('./pages/admin/SystemSettingsPage'));
const InspectionsPage = lazy(() => import('./pages/admin/InspectionsPage'));
const CreateInspectionPage = lazy(() => import('./pages/admin/CreateInspectionPage'));
const InspectionDetailPage = lazy(() => import('./pages/admin/InspectionDetailPage'));
const OperatorApplicationsPage = lazy(() => import('./pages/admin/OperatorApplicationsPage'));
const PendingPermitsPage = lazy(() => import('./pages/admin/PendingPermitsPage'));
const ExpiredPermitsPage = lazy(() => import('./pages/admin/ExpiredPermitsPage'));
const ComplianceAlertsPage = lazy(() => import('./pages/admin/ComplianceAlertsPage'));
const AllFacilitiesPage = lazy(() => import('./pages/admin/AllFacilitiesPage'));
const TrackingPlantsPage = lazy(() => import('./pages/admin/TrackingPlantsPage'));
const TrackingTransfersPage = lazy(() => import('./pages/admin/TrackingTransfersPage'));
const TrackingSalesPage = lazy(() => import('./pages/admin/TrackingSalesPage'));

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const PageSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <Spin size="large" />
  </div>
);

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('reason') === 'expired') {
      message.warning('Your session has expired. Please log in again.');
      searchParams.delete('reason');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  if (isLoading) return <PageSpinner />;

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* ----------------------------------------------------------------- */}
        {/* Auth routes (public) — wrapped in AuthLayout                      */}
        {/* ----------------------------------------------------------------- */}
        <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="/login/mfa" element={<AuthLayout><MfaPage /></AuthLayout>} />
        <Route path="/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
        <Route path="/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />
        <Route path="/change-password" element={
          <ProtectedRoute><AuthLayout><ChangePasswordPage /></AuthLayout></ProtectedRoute>
        } />

        {/* ----------------------------------------------------------------- */}
        {/* Operator Portal — 13 pages + placeholders                         */}
        {/* ----------------------------------------------------------------- */}
        <Route path="/operator" element={
          <ProtectedRoute allowedRoles={['operator_admin', 'operator_staff']}>
            <OperatorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OperatorDashboard />} />
          <Route path="dashboard" element={<OperatorDashboard />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="plants" element={<PlantsPage />} />
          <Route path="plants/register" element={<PlantRegisterPage />} />
          <Route path="plants/:id" element={<PlantDetailPage />} />
          <Route path="plants/batches" element={<BatchesPage />} />
          <Route path="harvests" element={<HarvestsPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="transfers/:id" element={<TransferDetailPage />} />
          <Route path="transfers/outgoing" element={<OutgoingTransfersPage />} />
          <Route path="transfers/incoming" element={<IncomingTransfersPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="sales/:id" element={<SaleDetailPage />} />
          <Route path="lab-results" element={<LabResultsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<OperatorSettingsPage />} />
        </Route>

        {/* ----------------------------------------------------------------- */}
        {/* Admin (Regulator) Portal — 13 pages + placeholders                */}
        {/* ----------------------------------------------------------------- */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['regulator', 'inspector']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<NationalDashboard />} />
          <Route path="dashboard" element={<NationalDashboard />} />
          <Route path="operators" element={<OperatorsPage />} />
          <Route path="operators/applications" element={<OperatorApplicationsPage />} />
          <Route path="operators/:id" element={<OperatorDetailPage />} />
          <Route path="permits" element={<PermitsPage />} />
          <Route path="permits/pending" element={<PendingPermitsPage />} />
          <Route path="permits/expired" element={<ExpiredPermitsPage />} />
          <Route path="permits/:id" element={<PermitDetailPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="compliance/alerts" element={<ComplianceAlertsPage />} />
          <Route path="compliance/inspections" element={<InspectionsPage />} />
          <Route path="compliance/inspections/new" element={<CreateInspectionPage />} />
          <Route path="compliance/inspections/:id" element={<InspectionDetailPage />} />
          <Route path="facilities" element={<AllFacilitiesPage />} />
          <Route path="facilities/map" element={<FacilitiesMapPage />} />
          <Route path="tracking/plants" element={<TrackingPlantsPage />} />
          <Route path="tracking/transfers" element={<TrackingTransfersPage />} />
          <Route path="tracking/sales" element={<TrackingSalesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/monthly" element={<ReportsPage />} />
          <Route path="reports/incb" element={<ReportsPage />} />
          <Route path="reports/custom" element={<ReportsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="settings" element={<SystemSettingsPage />} />
          <Route path="settings/general" element={<SystemSettingsPage />} />
          <Route path="settings/thresholds" element={<SystemSettingsPage />} />
          <Route path="settings/users" element={<SystemSettingsPage />} />
        </Route>

        {/* ----------------------------------------------------------------- */}
        {/* Public static/info pages                                           */}
        {/* ----------------------------------------------------------------- */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/for-operators" element={<ForOperatorsPage />} />
        <Route path="/for-regulators" element={<ForRegulatorsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/paia" element={<PaiaPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/accessibility" element={<AccessibilityPage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="/support" element={<AboutPage />} />
        <Route path="/report-issue" element={<AboutPage />} />

        {/* ----------------------------------------------------------------- */}
        {/* Root redirect based on user role                                   */}
        {/* ----------------------------------------------------------------- */}
        <Route path="/" element={
          user
            ? <Navigate to={user.role === 'regulator' || user.role === 'inspector' ? '/admin' : '/operator'} replace />
            : <Navigate to="/login" replace />
        } />

        {/* Catch-all 404 */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
