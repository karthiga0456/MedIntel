import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Siren, Warning, CheckCircle, Clock, 
  MapPin, PlusCircle, X, Funnel, FirstAid
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

function QueueSkeleton() {
  return (
    <tr>
      <td colSpan="6" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }} />
          <div className="skeleton skeleton-title" style={{ width: '150px' }} />
          <div className="skeleton skeleton-text" style={{ flex: 1 }} />
        </div>
      </td>
    </tr>
  );
}

export default function Emergency() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [dispatchWorkerId, setDispatchWorkerId] = useState('');

  const [formData, setFormData] = useState({
    patient_name: '', patient_id: '', symptoms: '', severity: 'CRITICAL', location: '', notes: ''
  });

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await api.emergency.getQueue(filterStatus || null, filterSeverity || null);
      setCases(res || []);
    } catch (err) {
      toast.error('Failed to fetch emergency queue.', 'Data Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQueue(); }, [filterStatus, filterSeverity]);

  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.emergency.report({
        patient_name: formData.patient_name,
        patient_id: formData.patient_id.trim() || undefined,
        symptoms: formData.symptoms,
        severity: formData.severity,
        location: formData.location,
        notes: formData.notes.trim() || undefined
      });
      setShowModal(false);
      setFormData({ patient_name: '', patient_id: '', symptoms: '', severity: 'CRITICAL', location: '', notes: '' });
      toast.success('Emergency incident reported successfully.', 'Dispatched');
      await loadQueue();
    } catch (err) {
      toast.error(`Failed to report emergency: ${err.message}`, 'Action Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (caseId, status, assignedWorker = null) => {
    try {
      await api.emergency.updateCase(caseId, {
        status,
        assigned_worker_id: assignedWorker || undefined
      });
      setSelectedCase(null);
      toast.success(`Case updated to ${status}.`, 'Status Updated');
      await loadQueue();
    } catch (err) {
      toast.error(`Failed to update case: ${err.message}`);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', gap: '6px', alignItems: 'center' }}><span className="dot pulse" style={{ backgroundColor: '#ef4444' }} />CRITICAL</span>;
      case 'HIGH': return <span className="badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>HIGH</span>;
      case 'MEDIUM': return <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>MEDIUM</span>;
      default: return <span className="badge badge-primary">LOW</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>PENDING DISPATCH</span>;
      case 'DISPATCHED': return <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>RESPONDER DISPATCHED</span>;
      case 'RESOLVED': return <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>RESOLVED</span>;
      case 'ESCALATED': return <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe' }}>ESCALATED</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const stats = {
    total: cases.length,
    critical: cases.filter(c => c.severity === 'CRITICAL').length,
    pending: cases.filter(c => c.status === 'PENDING').length,
    resolved: cases.filter(c => c.status === 'RESOLVED').length
  };

  return (
    <div className="module-view">
      <header className="module-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(220,38,38,0.1) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)'
          }}>
            <Siren size={26} weight="duotone" color="#ef4444" />
          </div>
          <div>
            <h2 style={{ fontSize: '22px' }}>Emergency Triage</h2>
            <p className="subtitle">High-priority incident queue and field dispatching</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard/nearby-hospitals')} className="btn-secondary" style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
            <FirstAid size={16} /> Nearby Hospitals
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff' }}>
            <PlusCircle size={16} /> Log Emergency
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid-kpi">
        <div className="stat-card" style={{ '--stat-accent': 'var(--text-secondary)' }}>
          <div className="stat-label">ACTIVE EMERGENCIES</div>
          {loading ? <div className="skeleton skeleton-text lg" style={{ width: '40px', marginTop: '4px' }} /> : <div className="stat-value">{stats.total}</div>}
        </div>
        <div className="stat-card" style={{ '--stat-accent': '#ef4444' }}>
          <div className="stat-label">CRITICAL SEVERITY</div>
          {loading ? <div className="skeleton skeleton-text lg" style={{ width: '40px', marginTop: '4px' }} /> : <div className="stat-value" style={{ color: '#f87171' }}>{stats.critical}</div>}
        </div>
        <div className="stat-card" style={{ '--stat-accent': '#f59e0b' }}>
          <div className="stat-label">PENDING DISPATCH</div>
          {loading ? <div className="skeleton skeleton-text lg" style={{ width: '40px', marginTop: '4px' }} /> : <div className="stat-value" style={{ color: '#fbbf24' }}>{stats.pending}</div>}
        </div>
        <div className="stat-card" style={{ '--stat-accent': '#10b981' }}>
          <div className="stat-label">RESOLVED TODAY</div>
          {loading ? <div className="skeleton skeleton-text lg" style={{ width: '40px', marginTop: '4px' }} /> : <div className="stat-value" style={{ color: '#34d399' }}>{stats.resolved}</div>}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Funnel size={16} color="var(--text-muted)" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending Dispatch</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical Only</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>SEVERITY</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>PATIENT / COMPLAINT</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>LOCATION</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>TIME</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <QueueSkeleton />
                  <QueueSkeleton />
                  <QueueSkeleton />
                </>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <Siren size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <br />No emergency cases in this queue view.
                  </td>
                </tr>
              ) : (
                cases.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--panel-border)' }}>
                    <td style={{ padding: '14px 16px' }}>{getSeverityBadge(c.severity)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{c.patient_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.symptoms}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <MapPin size={14} color="var(--accent-cyan)" /> {c.location}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {getStatusBadge(c.status)}
                      {c.assigned_worker_id && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Worker: {c.assigned_worker_id}</div>}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {c.status === 'PENDING' && (
                          <button onClick={() => { setSelectedCase(c); setDispatchWorkerId('Unit 1 - Priority Response'); }} className="btn-primary btn-sm">
                            Dispatch
                          </button>
                        )}
                        {c.status === 'DISPATCHED' && (
                          <button onClick={() => handleUpdateStatus(c.id, 'RESOLVED')} className="btn-secondary btn-sm" style={{ color: 'var(--accent-green)', borderColor: 'rgba(16,185,129,0.3)' }}>
                            Mark Resolved
                          </button>
                        )}
                        {c.status !== 'RESOLVED' && (
                          <button onClick={() => handleUpdateStatus(c.id, 'ESCALATED')} className="btn-secondary btn-sm" style={{ color: '#f87171', borderColor: 'transparent', padding: '4px 8px' }}>
                            Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {selectedCase && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCase(null); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Dispatch First Responder</h3>
              <button className="modal-close" onClick={() => setSelectedCase(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Assign field worker or ambulance to <strong>{selectedCase.patient_name}</strong> at <strong>{selectedCase.location}</strong>.
              </p>
              <div className="form-group">
                <label>Assigned Unit</label>
                <input 
                  type="text" list="worker-list" value={dispatchWorkerId} 
                  onChange={e => setDispatchWorkerId(e.target.value)}
                  placeholder="Select or type unit name..."
                />
                <datalist id="worker-list">
                  <option value="Unit 1 - Priority Response" />
                  <option value="Unit 2 - ASHA Lead" />
                  <option value="108 Emergency Ambulance" />
                </datalist>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedCase(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => handleUpdateStatus(selectedCase.id, 'DISPATCHED', dispatchWorkerId)}>
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#f87171', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Siren size={18} /> Report Emergency
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateCase} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Patient Name *</label>
                <input type="text" required placeholder="e.g. Ramesh Kumar" value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Severity Level *</label>
                  <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}>
                    <option value="CRITICAL">CRITICAL (Life-Threatening)</option>
                    <option value="HIGH">HIGH (Urgent Care)</option>
                    <option value="MEDIUM">MEDIUM (Intermediate)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Location / Village *</label>
                  <input type="text" required placeholder="e.g. Ward 4" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Symptoms *</label>
                <textarea rows="3" required placeholder="Severe distress, unconsciousness..." value={formData.symptoms} onChange={e => setFormData({...formData, symptoms: e.target.value})} />
              </div>
              <div className="modal-footer" style={{ marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} disabled={submitting}>
                  {submitting ? 'Triggering Alarm...' : 'Transmit Emergency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
