import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  Heartbeat, 
  Robot, 
  Books, 
  ChartLineUp, 
  UsersThree,
  ChartPieSlice,
  Shield
} from '@phosphor-icons/react';

export default function DashboardLayout() {
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="glass sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Heartbeat weight="fill" />
          </div>
          <h1>MedIntel</h1>
        </div>
        
        <nav>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', marginTop: '16px', paddingLeft: '20px' }}>
            CORE MODULES
          </div>
          <NavLink to="/dashboard/assistant" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Robot weight="regular" />
            <span>AI Assistant</span>
          </NavLink>
          <NavLink to="/dashboard/rag" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Books weight="regular" />
            <span>Knowledge Base</span>
          </NavLink>
          <NavLink to="/dashboard/outbreak" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <ChartLineUp weight="regular" />
            <span>Outbreak Engine</span>
          </NavLink>
          <NavLink to="/dashboard/worker" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <UsersThree weight="regular" />
            <span>Worker Portal</span>
          </NavLink>
          <NavLink to="/dashboard/insurance" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Shield weight="regular" />
            <span>Insurance Agent</span>
          </NavLink>

          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', marginTop: '24px', paddingLeft: '20px' }}>
            MANAGEMENT
          </div>
          <NavLink to="/dashboard/analytics" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <ChartPieSlice weight="regular" />
            <span>Reports & Analytics</span>
          </NavLink>
          <NavLink to="/dashboard/admin" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Shield weight="regular" />
            <span>Admin Settings</span>
          </NavLink>
        </nav>
        
        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className="dot pulse"></span>
            <span>System Online (React Node)</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="glass main-content">
        <Outlet />
      </main>
    </div>
  );
}
