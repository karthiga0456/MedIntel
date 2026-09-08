import React from 'react';
import { Shield, Users, Database, Globe, ClipboardText, Heartbeat } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const navigate = useNavigate();

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Admin &amp; Management</h2>
        <p className="subtitle">Configure Multi-Factor Auth, Role-Based Access, Patient Registry, and Infrastructure.</p>
      </header>

      <div className="grid-2">
        {/* Patient Registry — new quick-access panel */}
        <div className="glass-panel" style={{ borderColor: 'rgba(34,211,238,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <ClipboardText size={32} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '20px' }}>Patient Registry</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>
            Register new patients, assign UHIDs, and manage the centralized citizen health database.
          </p>
          <button
            id="go-patient-registry-btn"
            className="btn-primary"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => navigate('/dashboard/patients')}
          >
            <ClipboardText size={16} />
            Open Patient Registry
          </button>
        </div>

        {/* User Management */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Users size={32} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '20px' }}>User Management</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>Manage doctors, health workers, and API access roles.</p>
          <button className="btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)' }}>
            Manage Roles
          </button>
        </div>

        {/* Data Sources */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Database size={32} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '20px' }}>Data Sources</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>Configure connections to WHO, ICMR, and MoHFW data feeds.</p>
          <button className="btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)' }}>
            Configure APIs
          </button>
        </div>

        {/* Security & Audit */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Shield size={32} color="var(--accent-green)" />
            <h3 style={{ fontSize: '20px' }}>Security &amp; Audit</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>View security logs and manage OAuth 2.0 settings.</p>
          <button className="btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)' }}>
            View Logs (ELK)
          </button>
        </div>

        {/* Infrastructure */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Globe size={32} color="var(--danger-red)" />
            <h3 style={{ fontSize: '20px' }}>Infrastructure</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>Monitor Kubernetes pods, Redis, and RabbitMQ health.</p>
          <button className="btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)' }}>
            Open Prometheus
          </button>
        </div>

        {/* Health Analytics */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Heartbeat size={32} color="var(--accent-yellow)" />
            <h3 style={{ fontSize: '20px' }}>Health Analytics</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>Epidemiological reports, disease surveillance, and public health metrics.</p>
          <button
            id="go-analytics-btn"
            className="btn-secondary"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)' }}
            onClick={() => navigate('/dashboard/analytics')}
          >
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
