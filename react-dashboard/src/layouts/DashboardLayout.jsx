import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Heartbeat, Robot, Books, ChartPieSlice,
  Users, Pill, Siren, Shield, MapPin, Bell,
  SignOut, CaretLeft, CaretRight, List, X,
  Sun, Moon, MagnifyingGlass, TerminalWindow,
} from '@phosphor-icons/react';
import { offlineSync } from '../services/offlineSync';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const NAV_CORE = [
  { to: '/dashboard/assistant',        icon: Robot,          label: 'AI Assistant' },
  { to: '/dashboard/rag',              icon: Books,          label: 'Medical Records RAG' },
  { to: '/dashboard/medicines',        icon: Pill,           label: 'Formulary & Rx' },
  { to: '/dashboard/insurance',        icon: Shield,         label: 'Insurance Agent' },
  { to: '/dashboard/nearby-hospitals', icon: MapPin,         label: 'Nearby Hospitals' },
  { to: '/dashboard/notifications',    icon: Bell,           label: 'Broadcasts', badge: true },
];

const NAV_ADMIN = [
  { to: '/dashboard/emergency', icon: Siren,         label: 'Emergency Triage' },
  { to: '/dashboard/analytics', icon: ChartPieSlice, label: 'Reports & Analytics' },
  { to: '/dashboard/patients',  icon: Users,         label: 'Patient Registry' },
  { to: '/dashboard/admin',     icon: Shield,        label: 'User Management' },
];

const CRUMB_MAP = {
  '/dashboard/assistant':        'AI Assistant',
  '/dashboard/rag':              'Medical Records RAG',
  '/dashboard/medicines':        'Formulary & Rx',
  '/dashboard/insurance':        'Insurance Agent',
  '/dashboard/nearby-hospitals': 'Nearby Hospitals',
  '/dashboard/notifications':    'Broadcasts',
  '/dashboard/emergency':        'Emergency Triage',
  '/dashboard/analytics':        'Reports & Analytics',
  '/dashboard/patients':         'Patient Registry',
  '/dashboard/admin':            'Admin Panel',
};

function getSyncBadge(status) {
  const map = {
    OFFLINE:      { color: '#ef4444', label: 'Offline (Queue Active)' },
    SYNCING:      { color: '#f59e0b', label: 'Syncing...' },
    'SYNC ERROR': { color: '#f97316', label: 'Sync Warning' },
    SYNCED:       { color: '#10b981', label: 'All Records Synced' },
  };
  return map[status] || { color: '#10b981', label: 'System Online' };
}

function SideNavItem({ item, collapsed, unreadCount }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} weight="regular" />
      <span className="sidebar-label">{item.label}</span>
      {item.badge && unreadCount > 0 && (
        <span
          className="badge-count"
          style={{
            marginLeft: 'auto',
            background: '#ef4444',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '10px',
            minWidth: '18px',
            textAlign: 'center',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </NavLink>
  );
}

function getTheme() { return localStorage.getItem('medintel_theme') || 'dark'; }
function applyTheme(t) {
  localStorage.setItem('medintel_theme', t);
  document.documentElement.setAttribute('data-theme', t);
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setThemeState] = useState(getTheme);
  const [syncInfo, setSyncInfo] = useState({ status: 'ONLINE', lastSyncTime: null });
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState('');

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setThemeState(next);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    const unsub = offlineSync.subscribe(info => setSyncInfo(info));
    return unsub;
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.notifications.list();
        setUnreadCount(res?.unread_count || 0);
      } catch (_) {}
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const badge = getSyncBadge(syncInfo.status);
  const userInitials = (currentUser?.email || 'U').substring(0, 2).toUpperCase();
  const currentPageLabel = CRUMB_MAP[location.pathname] || 'Dashboard';

  return (
    <div className="app-container">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={['glass sidebar', collapsed ? 'collapsed' : '', mobileOpen ? 'mobile-open' : ''].filter(Boolean).join(' ')}
        aria-label="Main navigation"
      >
        <div className="brand">
          <div className="brand-icon"><TerminalWindow weight="bold" size={24} /></div>
          <h1>NEXUS UI</h1>
          <button
            className="sidebar-collapse-btn"
            onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <CaretRight size={14} weight="bold" /> : <CaretLeft size={14} weight="bold" />}
          </button>
        </div>

        <div className="user-profile-card">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-profile-info">
            <div className="user-email" title={currentUser?.email}>
              {currentUser?.email || 'User'}
            </div>
            <span className={'user-role-badge ' + (isAdmin ? 'admin' : 'worker')}>
              {isAdmin ? 'System Admin' : 'Staff'}
            </span>
          </div>
        </div>

        <nav>
          <div className="nav-section-label">Clinical &amp; Care</div>
          {NAV_CORE.map(item => (
            <SideNavItem key={item.to} item={item} collapsed={collapsed} unreadCount={unreadCount} />
          ))}

          {isAdmin && (
            <>
              <div className="nav-section-label" style={{ marginTop: '8px' }}>Administration</div>
              {NAV_ADMIN.map(item => (
                <SideNavItem key={item.to} item={item} collapsed={collapsed} unreadCount={0} />
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div
            className="status-indicator"
            title={syncInfo.lastSyncTime ? ('Last sync: ' + syncInfo.lastSyncTime) : 'Live'}
          >
            <span className="dot pulse" style={{ backgroundColor: badge.color }} />
            <span className="sidebar-footer-label">{badge.label}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="top-nav" role="banner">
          <div className="top-nav-left">
            <button
              className="hamburger-btn"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={18} /> : <List size={18} />}
            </button>

            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <span className="breadcrumb-item">MedIntel</span>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-item active">{currentPageLabel}</span>
            </nav>
          </div>

          <div className="global-search-wrapper">
            <MagnifyingGlass size={15} />
            <input
              type="search"
              className="global-search-input"
              placeholder="Search patients, medicines..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Global search"
            />
          </div>

          <div className="top-nav-right">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              className="icon-btn"
              onClick={() => navigate('/dashboard/notifications')}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className="notif-dot" />}
            </button>

            <button className="logout-btn" onClick={handleLogout}>
              <SignOut size={14} /> Logout
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
