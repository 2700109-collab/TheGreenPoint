/**
 * OperatorLayout — ProLayout wrapper for the Portal operator view.
 *
 * Migrated from legacy Ant `Layout + Sider + Menu` to
 * `@ant-design/pro-components` ProLayout per FrontEnd.md §1.3.
 */

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import { Space, Avatar, Badge, Button, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  LayoutDashboard,
  Sprout,
  Building2,
  Wheat,
  FlaskConical,
  Truck,
  ShoppingCart,
  Bell,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Search,
} from 'lucide-react';
import {
  CannabisLeaf,
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
// Menu configuration — per spec §1.3 (prefixed with /operator/)
// ---------------------------------------------------------------------------

const operatorMenuRoutes = [
  {
    path: '/operator/dashboard',
    name: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    path: '/operator/plants',
    name: 'Plant Management',
    icon: <Sprout size={20} />,
    routes: [
      { path: '/operator/plants', name: 'All Plants' },
      { path: '/operator/plants/register', name: 'Register Plant' },
      { path: '/operator/plants/batches', name: 'Batches' },
    ],
  },
  {
    path: '/operator/facilities',
    name: 'Facilities',
    icon: <Building2 size={20} />,
  },
  {
    path: '/operator/harvests',
    name: 'Harvests',
    icon: <Wheat size={20} />,
  },
  {
    path: '/operator/lab-results',
    name: 'Lab Results',
    icon: <FlaskConical size={20} />,
  },
  {
    path: '/operator/transfers',
    name: 'Transfers',
    icon: <Truck size={20} />,
    routes: [
      { path: '/operator/transfers', name: 'All Transfers' },
      { path: '/operator/transfers/outgoing', name: 'Outgoing' },
      { path: '/operator/transfers/incoming', name: 'Incoming' },
    ],
  },
  {
    path: '/operator/sales',
    name: 'Sales',
    icon: <ShoppingCart size={20} />,
  },
];

// ---------------------------------------------------------------------------
// User dropdown
// ---------------------------------------------------------------------------

const userMenuItems: MenuProps['items'] = [
  { key: 'profile', icon: <User size={16} />, label: 'My Profile' },
  { key: 'settings', icon: <Settings size={16} />, label: 'Operator Settings' },
  { key: 'notifications', icon: <Bell size={16} />, label: 'Notification Preferences' },
  { key: 'help', icon: <HelpCircle size={16} />, label: 'Help & Support' },
  { type: 'divider' as const },
  { key: 'logout', icon: <LogOut size={16} />, label: 'Sign Out', danger: true },
];

// ---------------------------------------------------------------------------
// ProLayout token overrides — per spec §1.3
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
    colorTextMenuActive: '#FFFFFF',
  },
  pageContainer: {
    paddingBlockPageContainerContent: 24,
    paddingInlinePageContainerContent: 24,
  },
};

// ---------------------------------------------------------------------------
// Mobile navigation tabs — per spec §1.5
// ---------------------------------------------------------------------------

const operatorMobileTabs: NavTab[] = [
  { key: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/operator/dashboard' },
  { key: 'plants', icon: <Sprout size={20} />, label: 'Plants', path: '/operator/plants' },
  { key: 'transfers', icon: <Truck size={20} />, label: 'Transfers', path: '/operator/transfers' },
  { key: 'sales', icon: <ShoppingCart size={20} />, label: 'Sales', path: '/operator/sales' },
];

const operatorMoreItems: NavTab[] = [
  { key: 'facilities', icon: <Building2 size={20} />, label: 'Facilities', path: '/operator/facilities' },
  { key: 'harvests', icon: <Wheat size={20} />, label: 'Harvests', path: '/operator/harvests' },
  { key: 'lab-results', icon: <FlaskConical size={20} />, label: 'Lab Results', path: '/operator/lab-results' },
];

// ---------------------------------------------------------------------------
// Breadcrumb label map
// ---------------------------------------------------------------------------

const breadcrumbMap: Record<string, string> = {
  operator: 'Home',
  dashboard: 'Dashboard',
  plants: 'Plant Management',
  register: 'Register Plant',
  batches: 'Batches',
  facilities: 'Facilities',
  harvests: 'Harvests',
  'lab-results': 'Lab Results',
  transfers: 'Transfers',
  outgoing: 'Outgoing',
  incoming: 'Incoming',
  sales: 'Sales',
  profile: 'My Profile',
  settings: 'Settings',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OperatorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { isMobile } = useBreakpoint();
  const { user, logout } = useAuth();

  const handleUserMenu: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'profile': navigate('/operator/profile'); break;
      case 'settings': navigate('/operator/settings'); break;
      case 'notifications': navigate('/operator/settings/notifications'); break;
      case 'help': /* open help panel */ break;
      case 'logout': logout(); navigate('/login'); break;
    }
  };

  // Masthead height compensation
  const mastheadHeight = isMobile ? 32 : 40;

  // Compute breadcrumb items from current path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', path: '/operator' },
    ...pathSegments.slice(1).map((seg, i) => ({
      label: breadcrumbMap[seg] ?? seg,
      path: i < pathSegments.length - 2
        ? '/' + pathSegments.slice(0, i + 2).join('/')
        : undefined,
    })),
  ];

  // Active tab key for mobile nav
  const mobileActiveKey = pathSegments[1] || 'dashboard';

  // User initials for avatar
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'O';

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Government masthead — fixed at top */}
      <GovMasthead />

      {/* Phase banner — below masthead */}
      <div style={{ marginTop: mastheadHeight }}>
        <PhaseBanner phase="pilot" feedbackHref="/feedback" appVersion="0.1.0" />
      </div>

      {/* ProLayout */}
      <ProLayout
        title="NCTS"
        logo={<CannabisLeaf size="lg" />}
        layout="mix"
        navTheme="light"
        fixSiderbar={true}
        fixedHeader={true}
        siderWidth={240}
        collapsedButtonRender={false}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        contentWidth="Fluid"
        token={proLayoutToken}
        location={{ pathname: location.pathname }}
        route={{ routes: operatorMenuRoutes }}
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
              <Tooltip title="Notifications">
                <Badge count={0} size="small">
                  <Button type="text" icon={<Bell size={20} />} />
                </Badge>
              </Tooltip>
              <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }}>
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar style={{ backgroundColor: '#1B3A5C' }} size="small">
                    {initials}
                  </Avatar>
                  {!isMobile && (
                    <span>{user?.firstName} {user?.lastName}</span>
                  )}
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
          tabs={operatorMobileTabs}
          activeKey={mobileActiveKey}
          onTabChange={(_key, path) => navigate(path)}
          moreItems={operatorMoreItems}
        />
      )}
    </div>
  );
}
