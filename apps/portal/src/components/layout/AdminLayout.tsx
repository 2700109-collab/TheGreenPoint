/**
 * AdminLayout — ProLayout wrapper for the Portal admin/regulatory view.
 *
 * Migrated from legacy Ant `Layout + Sider + Menu` to
 * `@ant-design/pro-components` ProLayout per FrontEnd.md §1.4.
 */

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import { Space, Avatar, Badge, Button, Dropdown, Tooltip, Tag } from 'antd';
import type { MenuProps } from 'antd';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  ShieldCheck,
  Building2,
  Truck,
  BarChart3,
  FileText,
  Settings,
  ShieldAlert,
  Search,
  User,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import {
  NctsShield,
  GovMasthead,
  PhaseBanner,
  GovFooter,
  MobileBottomNav,
  AppBreadcrumbs,
  useBreakpoint,
} from '@ncts/ui';
import type { NavTab, BreadcrumbItem } from '@ncts/ui';
import { useAuth } from '../../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Menu configuration — per spec §1.4 (prefixed with /admin/)
// ---------------------------------------------------------------------------

const adminMenuRoutes = [
  {
    path: '/admin/dashboard',
    name: 'National Overview',
    icon: <LayoutDashboard size={20} />,
  },
  {
    path: '/admin/operators',
    name: 'Operators',
    icon: <Users size={20} />,
    routes: [
      { path: '/admin/operators', name: 'All Operators' },
      { path: '/admin/operators/applications', name: 'Applications' },
    ],
  },
  {
    path: '/admin/permits',
    name: 'Permits & Licenses',
    icon: <FileCheck size={20} />,
    routes: [
      { path: '/admin/permits', name: 'All Permits' },
      { path: '/admin/permits/pending', name: 'Pending Review' },
      { path: '/admin/permits/expired', name: 'Expired' },
    ],
  },
  {
    path: '/admin/compliance',
    name: 'Compliance',
    icon: <ShieldCheck size={20} />,
    routes: [
      { path: '/admin/compliance', name: 'Overview' },
      { path: '/admin/compliance/alerts', name: 'Active Alerts' },
      { path: '/admin/compliance/inspections', name: 'Inspections' },
    ],
  },
  {
    path: '/admin/facilities',
    name: 'Facilities',
    icon: <Building2 size={20} />,
    routes: [
      { path: '/admin/facilities', name: 'All Facilities' },
      { path: '/admin/facilities/map', name: 'Map View' },
    ],
  },
  {
    path: '/admin/tracking',
    name: 'Supply Chain',
    icon: <Truck size={20} />,
    routes: [
      { path: '/admin/tracking/plants', name: 'Plant Registry' },
      { path: '/admin/tracking/transfers', name: 'Transfers' },
      { path: '/admin/tracking/sales', name: 'Sales' },
    ],
  },
  {
    path: '/admin/reports',
    name: 'Reports',
    icon: <BarChart3 size={20} />,
    routes: [
      { path: '/admin/reports/monthly', name: 'Monthly Reports' },
      { path: '/admin/reports/incb', name: 'INCB Export' },
      { path: '/admin/reports/custom', name: 'Custom Builder' },
    ],
  },
  {
    path: '/admin/audit',
    name: 'Audit Log',
    icon: <FileText size={20} />,
  },
  {
    path: '/admin/settings',
    name: 'System Settings',
    icon: <Settings size={20} />,
    routes: [
      { path: '/admin/settings/general', name: 'General' },
      { path: '/admin/settings/thresholds', name: 'Compliance Thresholds' },
      { path: '/admin/settings/users', name: 'Admin Users' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Admin user dropdown
// ---------------------------------------------------------------------------

const adminUserMenuItems: MenuProps['items'] = [
  { key: 'profile', icon: <User size={16} />, label: 'My Profile' },
  { key: 'settings', icon: <Settings size={16} />, label: 'System Settings' },
  { key: 'help', icon: <HelpCircle size={16} />, label: 'Help & Support' },
  { type: 'divider' as const },
  { key: 'logout', icon: <LogOut size={16} />, label: 'Sign Out', danger: true },
];

// ---------------------------------------------------------------------------
// ProLayout token overrides — per spec §1.4
// ---------------------------------------------------------------------------

const proLayoutToken = {
  header: {
    colorBgHeader: '#FFFFFF',
    heightLayoutHeader: 56,
  },
  sider: {
    colorMenuBackground: '#001529',
    colorTextMenu: 'rgba(255,255,255,0.65)',
    colorTextMenuSelected: '#FFFFFF',
    colorBgMenuItemSelected: '#1B3A5C',
  },
  pageContainer: {
    paddingBlockPageContainerContent: 24,
    paddingInlinePageContainerContent: 24,
  },
};

// ---------------------------------------------------------------------------
// Mobile navigation tabs — per spec §1.5
// ---------------------------------------------------------------------------

const adminMobileTabs: NavTab[] = [
  { key: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview', path: '/admin/dashboard' },
  { key: 'compliance', icon: <ShieldCheck size={20} />, label: 'Compliance', path: '/admin/compliance' },
  { key: 'permits', icon: <FileCheck size={20} />, label: 'Permits', path: '/admin/permits' },
  { key: 'facilities', icon: <Building2 size={20} />, label: 'Facilities', path: '/admin/facilities' },
];

const adminMoreItems: NavTab[] = [
  { key: 'operators', icon: <Users size={20} />, label: 'Operators', path: '/admin/operators' },
  { key: 'tracking', icon: <Truck size={20} />, label: 'Supply Chain', path: '/admin/tracking' },
  { key: 'reports', icon: <BarChart3 size={20} />, label: 'Reports', path: '/admin/reports' },
  { key: 'audit', icon: <FileText size={20} />, label: 'Audit Log', path: '/admin/audit' },
  { key: 'settings', icon: <Settings size={20} />, label: 'Settings', path: '/admin/settings' },
];

// ---------------------------------------------------------------------------
// Breadcrumb label map
// ---------------------------------------------------------------------------

const adminBreadcrumbMap: Record<string, string> = {
  admin: 'Home',
  dashboard: 'National Overview',
  operators: 'Operators',
  applications: 'Applications',
  permits: 'Permits & Licenses',
  pending: 'Pending Review',
  expired: 'Expired',
  compliance: 'Compliance',
  alerts: 'Active Alerts',
  inspections: 'Inspections',
  facilities: 'Facilities',
  map: 'Map View',
  tracking: 'Supply Chain',
  plants: 'Plant Registry',
  transfers: 'Transfers',
  sales: 'Sales',
  reports: 'Reports',
  monthly: 'Monthly Reports',
  incb: 'INCB Export',
  custom: 'Custom Builder',
  audit: 'Audit Log',
  settings: 'System Settings',
  general: 'General',
  thresholds: 'Compliance Thresholds',
  users: 'Admin Users',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { isMobile } = useBreakpoint();
  const { user, logout } = useAuth();

  const handleUserMenu: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'profile': navigate('/admin/profile'); break;
      case 'settings': navigate('/admin/settings'); break;
      case 'help': /* open help panel */ break;
      case 'logout': logout(); navigate('/login'); break;
    }
  };

  const mastheadHeight = isMobile ? 32 : 40;

  // Compute breadcrumb items from current path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', path: '/admin' },
    ...pathSegments.slice(1).map((seg, i) => ({
      label: adminBreadcrumbMap[seg] ?? seg,
      path: i < pathSegments.length - 2
        ? '/' + pathSegments.slice(0, i + 2).join('/')
        : undefined,
    })),
  ];

  // Active tab key for mobile nav
  const mobileActiveKey = pathSegments[1] || 'dashboard';

  // User initials for avatar
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'A';

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Government masthead */}
      <GovMasthead />

      {/* Phase banner */}
      <div style={{ marginTop: mastheadHeight }}>
        <PhaseBanner phase="pilot" feedbackHref="/feedback" appVersion="0.1.0" />
      </div>

      {/* ProLayout */}
      <ProLayout
        title="NCTS Admin"
        logo={<NctsShield size="lg" />}
        layout="mix"
        navTheme="light"
        fixSiderbar={true}
        fixedHeader={true}
        siderWidth={260}
        collapsedButtonRender={false}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        contentWidth="Fluid"
        token={proLayoutToken}
        location={{ pathname: location.pathname }}
        route={{ routes: adminMenuRoutes }}
        menuItemRender={(item: Record<string, any>, dom: React.ReactNode) => (
          <a
            href={item.path || '#'}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              item.path && navigate(item.path);
            }}
          >
            {dom}
          </a>
        )}
        subMenuItemRender={(_item: Record<string, any>, dom: React.ReactNode) => dom}
        headerContentRender={() => (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            {/* Left: Breadcrumbs */}
            {!isMobile && <AppBreadcrumbs items={breadcrumbItems} />}

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
              <Tooltip title="Search">
                <Button type="text" icon={<Search size={20} />} />
              </Tooltip>
              <Tooltip title="Compliance Alerts">
                <Badge count={0} size="small" color="#CF1322">
                  <Button type="text" icon={<ShieldAlert size={20} />} />
                </Badge>
              </Tooltip>
              <Dropdown menu={{ items: adminUserMenuItems, onClick: handleUserMenu }}>
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar style={{ backgroundColor: '#007A4D' }} size="small">
                    {initials}
                  </Avatar>
                  {!isMobile && (
                    <span>{user?.firstName} {user?.lastName}</span>
                  )}
                  <Tag color="green">Admin</Tag>
                </Space>
              </Dropdown>
            </div>
          </div>
        )}
        footerRender={() => <GovFooter />}
      >
        <div id="main-content" style={isMobile ? { paddingBottom: 72 } : undefined}>
          <Outlet />
        </div>
      </ProLayout>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <MobileBottomNav
          tabs={adminMobileTabs}
          activeKey={mobileActiveKey}
          onTabChange={(_key, path) => navigate(path)}
          moreItems={adminMoreItems}
        />
      )}
    </div>
  );
}
