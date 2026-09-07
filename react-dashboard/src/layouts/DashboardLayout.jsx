import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Heartbeat, 
  Robot, 
  Books, 
  ChartLineUp, 
  UsersThree,
  ChartPieSlice,
  Shield,
  Users,
  Flask,
  Pill,
  Pulse,
  Compass,
  Siren,
  Bell,
  ShieldCheck,
  ArrowLeft,
  SignOut,
  UserCheck
} from '@phosphor-icons/react';
import { offlineSync } from '../services/offlineSync';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [syncInfo, setSyncInfo] = useState({ status: 'ONLINE', lastSyncTime: null });
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const unsubscribe = offlineSync.subscribe((info) => {
      setSyncInfo(info);
    });

    const fetchNotifications = async () => {
      try {
        const res = await api.notifications.list();
        setUnreadCount(res?.unread_count || 0);
      } catch (_) {}
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getSyncBadge = () => {
    switch (syncInfo.status) {
      case 'OFFLINE':
        return { color: '#ef4444', label: 'Offline (Queue Active)' };
      case 'SYNCING':
        return { color: '#f59e0b', label: 'Syncing Offline Queue...' };
      case 'SYNC ERROR':
        return { color: '#f97316', label: 'Sync Warning (Auto Retry)' };
      case 'SYNCED':
        return { color: '#10b981', label: 'All Records Synced' };
      default:
        return { color: '#10b981', label: 'System Online (Sync Ready)' };
    }
  };

  const badge = getSyncBadge();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="glass sidebar" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className="brand">
          <div className="brand-icon">
            <Heartbeat weight="fill" />
          </div>
          <h1>MedIntel</h1>
        </div>

        {/* Logged in User Profile Snippet */}
        <div style={{ padding: '0 16px 16px 16px', margin: '0 12px 12px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', paddingTop: '12px' }}>
            <UserCheck size={18} color="var(--accent-yellow)" weight="bold" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser?.email || 'User Session'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', background: isAdmin ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: isAdmin ? '#60a5fa' : '#34d399', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
              {isAdmin ? 'System Admin' : 'Standard User'}
            </span>
            <button 
              onClick={handleLogout}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '2px 6px' }}
              title="Logout"
            >
              <SignOut size={14} weight="bold" /> Logout
            </button>
          </div>
        </div>
        
        <nav style={{ paddingBottom: '30px', flex: 1 }}>
          {/* Section: Core Clinical & Care Services (Always Visible) */}
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px', marginTop: '8px', paddingLeft: '20px' }}>
            MY WORKSPACE & CLINICAL
          </div>
          <NavLink to="/dashboard/patients" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Users weight="regular" />
            <span>Patients Registry</span>
          </NavLink>
          <NavLink to="/dashboard/assistant" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Robot weight="regular" />
            <span>AI Assistant</span>
          </NavLink>
          <NavLink to="/dashboard/rag" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Books weight="regular" />
            <span>Medical Records RAG</span>
          </NavLink>
          <NavLink to="/dashboard/labs" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Flask weight="regular" />
            <span>Diagnostic Labs</span>
          </NavLink>
          <NavLink to="/dashboard/medicines" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Pill weight="regular" />
            <span>Formulary & Rx</span>
          </NavLink>
          <NavLink to="/dashboard/worker" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <UsersThree weight="regular" />
            <span>Health Worker Portal</span>
          </NavLink>
          <NavLink to="/dashboard/notifications" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Bell weight="regular" />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444'
                }}></span>
              )}
            </div>
            <span>Broadcasts</span>
            {unreadCount > 0 && (
              <span className="badge" style={{ marginLeft: 'auto', backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', padding: '1px 6px' }}>
                {unreadCount}
              </span>
            )}
          </NavLink>

          {/* Section: Public Health & Governance (Shown for Admin users only) */}
          {isAdmin && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px', marginTop: '22px', paddingLeft: '20px' }}>
                PUBLIC HEALTH & SURVEILLANCE
              </div>
              <NavLink to="/dashboard/surveillance" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <Pulse weight="regular" />
                <span>Disease Surveillance</span>
              </NavLink>
              <NavLink to="/dashboard/outbreak" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <ChartLineUp weight="regular" />
                <span>Outbreak Engine</span>
              </NavLink>
              <NavLink to="/dashboard/map" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <Compass weight="regular" />
                <span>GIS Health Map</span>
              </NavLink>
              <NavLink to="/dashboard/emergency" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <Siren weight="regular" />
                <span>Emergency Triage</span>
              </NavLink>
              <NavLink to="/dashboard/insurance" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <Shield weight="regular" />
                <span>Insurance Agent</span>
              </NavLink>

              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px', marginTop: '22px', paddingLeft: '20px' }}>
                ADMINISTRATION & AUDIT
              </div>
              <NavLink to="/dashboard/analytics" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <ChartPieSlice weight="regular" />
                <span>Reports & Analytics</span>
              </NavLink>
              <NavLink to="/dashboard/admin/audit" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <ShieldCheck weight="regular" />
                <span>Security Audit Trail</span>
              </NavLink>
              <NavLink to="/dashboard/admin" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                <Shield weight="regular" />
                <span>User Management</span>
              </NavLink>
            </>
          )}
        </nav>
        
        <div className="sidebar-footer">
          <div className="status-indicator" title={syncInfo.lastSyncTime ? `Last sync: ${syncInfo.lastSyncTime}` : 'Live Node'}>
            <span className="dot pulse" style={{ backgroundColor: badge.color }}></span>
            <span style={{ fontSize: '12px' }}>{badge.label}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="glass main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 24px 16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => navigate('/')} 
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '6px 12px' }}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Role:</span>
              <strong style={{ color: isAdmin ? '#60a5fa' : '#34d399' }}>{isAdmin ? 'System Admin' : 'Standard User'}</strong>
            </div>
            <button 
              onClick={handleLogout}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <SignOut size={14} /> Logout
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
