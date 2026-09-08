import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Siren, 
  Warning, 
  CheckCircle, 
  Clock, 
  UserPlus, 
  MapPin, 
  PhoneCall, 
  PlusCircle, 
  X,
  Funnel,
  FirstAid
} from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Emergency() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [dispatchWorkerId, setDispatchWorkerId] = useState('');

  const [formData, setFormData] = useState({
    patient_name: '',
    patient_id: '',
    symptoms: '',
    severity: 'CRITICAL',
    location: '',
    notes: ''
  });

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.emergency.getQueue(filterStatus || null, filterSeverity || null);
      setCases(res || []);
    } catch (err) {
      console.error('Failed to load emergency queue:', err);
      setError(err.message || 'Error fetching emergency queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [filterStatus, filterSeverity]);

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
      setFormData({
        patient_name: '',
        patient_id: '',
        symptoms: '',
        severity: 'CRITICAL',
        location: '',
        notes: ''
      });
      await loadQueue();
    } catch (err) {
      alert(`Failed to report emergency: ${err.message}`);
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
      await loadQueue();
    } catch (err) {
      alert(`Failed to update emergency case: ${err.message}`);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <span className="badge" style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.25)', 
            color: '#f87171', 
            border: '1px solid rgba(239,68,68,0.5)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}></span>
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.4)' }}>
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}>
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#38bdf8' }}>
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>PENDING DISPATCH</span>;
      case 'DISPATCHED':
        return <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd' }}>RESPONDER DISPATCHED</span>;
      case 'RESOLVED':
        return <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7' }}>RESOLVED</span>;
      case 'ESCALATED':
        return <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe' }}>ESCALATED TO ICU</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Stats calculation
  const totalCount = cases.length;
  const criticalCount = cases.filter(c => c.severity === 'CRITICAL').length;
  const pendingCount = cases.filter(c => c.status === 'PENDING').length;
  const resolvedCount = cases.filter(c => c.status === 'RESOLVED').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
            }}>
              <Siren size={24} weight="bold" color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Emergency Rapid Response Triage</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                High-priority incident queue, worker field dispatching, and hospital transfer tracking
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => navigate('/dashboard/nearby-hospitals')}
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderColor: '#3b82f6', color: '#3b82f6' }}
          >
            <FirstAid size={18} weight="bold" />
            Find Nearby Hospitals
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
          >
            <PlusCircle size={18} weight="bold" />
            Log Emergency Case
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card glass" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            <span>ACTIVE EMERGENCIES</span>
            <Warning size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {loading ? '...' : totalCount}
          </div>
        </div>

        <div className="card glass" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            <span>CRITICAL SEVERITY</span>
            <Siren size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#f87171', marginTop: '6px' }}>
            {loading ? '...' : criticalCount}
          </div>
        </div>

        <div className="card glass" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            <span>PENDING DISPATCH</span>
            <Clock size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#fbbf24', marginTop: '6px' }}>
            {loading ? '...' : pendingCount}
          </div>
        </div>

        <div className="card glass" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            <span>RESOLVED TODAY</span>
            <CheckCircle size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>
            {loading ? '...' : resolvedCount}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card glass" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
          <Funnel size={16} />
          <span>Filter Queue:</span>
        </div>

        <select 
          className="input-field" 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ width: '180px', padding: '6px 12px', fontSize: '13px' }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending Dispatch</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ESCALATED">Escalated</option>
        </select>

        <select 
          className="input-field" 
          value={filterSeverity} 
          onChange={(e) => setFilterSeverity(e.target.value)}
          style={{ width: '180px', padding: '6px 12px', fontSize: '13px' }}
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical Only</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
        </select>
      </div>

      {/* Triage Queue Table */}
      <div className="card glass" style={{ padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>SEVERITY</th>
                <th style={{ padding: '12px 16px' }}>PATIENT / COMPLAINT</th>
                <th style={{ padding: '12px 16px' }}>LOCATION</th>
                <th style={{ padding: '12px 16px' }}>REPORTED AT</th>
                <th style={{ padding: '12px 16px' }}>DISPATCH STATUS</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading emergency triage queue...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No emergency cases in this queue view.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      {getSeverityBadge(c.severity)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{c.patient_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {c.symptoms}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                        <MapPin size={16} color="#06b6d4" />
                        <span>{c.location}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(c.status)}
                      {c.assigned_worker_id && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          Worker: {c.assigned_worker_id}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {c.status === 'PENDING' && (
                          <button 
                            onClick={() => { setSelectedCase(c); setDispatchWorkerId('worker-field-1'); }}
                            className="btn-primary" 
                            style={{ fontSize: '11px', padding: '5px 10px', backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
                          >
                            Dispatch
                          </button>
                        )}
                        {c.status === 'DISPATCHED' && (
                          <button 
                            onClick={() => handleUpdateStatus(c.id, 'RESOLVED')}
                            className="btn-secondary" 
                            style={{ fontSize: '11px', padding: '5px 10px', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}
                          >
                            Mark Resolved
                          </button>
                        )}
                        {c.status !== 'RESOLVED' && (
                          <button 
                            onClick={() => handleUpdateStatus(c.id, 'ESCALATED')}
                            className="btn-secondary" 
                            style={{ fontSize: '11px', padding: '5px 10px', color: '#f87171' }}
                          >
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

      {/* Modal: Dispatch Worker */}
      {selectedCase && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass card" style={{ maxWidth: '420px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '12px' }}>
              Dispatch Emergency First Responder
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Assign field health worker or 108 ambulance unit to <strong>{selectedCase.patient_name}</strong> at <strong>{selectedCase.location}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                ASSIGNED FIELD WORKER / UNIT
              </label>
              <input 
                type="text"
                list="worker-list"
                className="input-field" 
                value={dispatchWorkerId} 
                onChange={(e) => setDispatchWorkerId(e.target.value)}
                placeholder="Select or type a custom worker name..."
              />
              <datalist id="worker-list">
                <option value="Unit 1 - Priya Sharma (Rapid Response)" />
                <option value="Unit 2 - Rajesh Kumar (ASHA Lead)" />
                <option value="108 Emergency Ambulance Unit (GVK EMRI)" />
              </datalist>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setSelectedCase(null)} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleUpdateStatus(selectedCase.id, 'DISPATCHED', dispatchWorkerId)}
                className="btn-primary"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Emergency Case */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass card" style={{ maxWidth: '500px', width: '100%', padding: '28px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <Siren size={22} weight="bold" />
                Report Emergency Incident
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  PATIENT NAME *
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.patient_name} 
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    SEVERITY LEVEL *
                  </label>
                  <select 
                    className="input-field"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    required
                  >
                    <option value="CRITICAL">CRITICAL (Life-Threatening)</option>
                    <option value="HIGH">HIGH (Urgent Care)</option>
                    <option value="MEDIUM">MEDIUM (Intermediate)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    LOCATION / VILLAGE *
                  </label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Alandurai Ward 4"
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  PRESENTING SYMPTOMS *
                </label>
                <textarea 
                  rows="3" 
                  className="input-field" 
                  placeholder="Severe respiratory distress, chest tightness, unconsciousness..."
                  value={formData.symptoms} 
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  required
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                  disabled={submitting}
                >
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
