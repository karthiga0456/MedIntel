import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Funnel, 
  ArrowClockwise, 
  User, 
  LockKey, 
  Globe, 
  FileText 
} from '@phosphor-icons/react';
import { api } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (actionFilter) params.action = actionFilter;
      const res = await api.audit.listLogs(params);
      setLogs(res || []);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
      setError(err.message || 'Error fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.user_id && l.user_id.toLowerCase().includes(term)) ||
      (l.resource && l.resource.toLowerCase().includes(term)) ||
      (l.resource_id && l.resource_id.toLowerCase().includes(term)) ||
      (l.action && l.action.toLowerCase().includes(term))
    );
  });

  const getResultBadge = (result) => {
    if (result === 'SUCCESS') {
      return <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>SUCCESS</span>;
    }
    return <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>{result || 'FAILED'}</span>;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} weight="bold" color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Security & Compliance Audit Trail</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              Immutable chronological record of authentication, PHI access, and system mutations
            </p>
          </div>
        </div>

        <button 
          onClick={loadLogs}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 16px' }}
        >
          <ArrowClockwise size={16} />
          Refresh Log Feed
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card glass" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input 
            type="text"
            className="input-field"
            placeholder="Search by User ID, Resource, or Action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Funnel size={16} color="var(--text-muted)" />
          <select 
            className="input-field"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ width: '200px', padding: '8px 12px', fontSize: '13px' }}
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="PATIENT_CREATE">PATIENT_CREATE</option>
            <option value="CONSULTATION_ADD">CONSULTATION_ADD</option>
            <option value="PRESCRIPTION_CREATE">PRESCRIPTION_CREATE</option>
            <option value="EMERGENCY_REPORT">EMERGENCY_REPORT</option>
            <option value="EMERGENCY_UPDATE">EMERGENCY_UPDATE</option>
            <option value="ROLE_UPDATE">ROLE_UPDATE</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card glass" style={{ padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>TIMESTAMP (UTC)</th>
                <th style={{ padding: '12px 16px' }}>USER ID</th>
                <th style={{ padding: '12px 16px' }}>ACTION</th>
                <th style={{ padding: '12px 16px' }}>RESOURCE</th>
                <th style={{ padding: '12px 16px' }}>RESOURCE ID</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
                <th style={{ padding: '12px 16px' }}>IP ORIGIN</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Fetching immutable audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No audit logs matching this criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0' }}>
                      {log.user_id || 'System Anonymous'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        background: 'rgba(255,255,255,0.06)', 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: '#38bdf8'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      {log.resource}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {log.resource_id || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getResultBadge(log.result)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace' }}>
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
