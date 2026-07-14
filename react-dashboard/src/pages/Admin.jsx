import React from 'react';
import { Shield, Users, Database, Globe } from '@phosphor-icons/react';

export default function Admin() {
  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Admin & Management</h2>
        <p className="subtitle">Configure Multi-Factor Auth, Role-Based Access, and Infrastructure.</p>
      </header>

      <div className="grid-2">
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Users size={32} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '20px' }}>User Management</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>Manage doctors, health workers, and API access.</p>
          <button className="btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)' }}>Manage Roles</button>
        </div>

        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Database size={32} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '20px' }}>Data Sources</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>Configure connections to WHO, ICMR, and MoHFW.</p>
          <button className="btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)' }}>Configure APIs</button>
        </div>

        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Shield size={32} color="var(--accent-green)" />
            <h3 style={{ fontSize: '20px' }}>Security & Audit</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>View security logs and manage OAuth 2.0 settings.</p>
          <button className="btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)' }}>View Logs (ELK)</button>
        </div>
        
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Globe size={32} color="var(--danger-red)" />
            <h3 style={{ fontSize: '20px' }}>Infrastructure</h3>
          </div>
          <p className="subtitle" style={{ marginBottom: '16px' }}>Monitor Kubernetes pods, Redis, and RabbitMQ.</p>
          <button className="btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)' }}>Open Prometheus</button>
        </div>
      </div>
    </div>
  );
}
