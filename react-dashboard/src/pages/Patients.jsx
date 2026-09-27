import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserPlus, MagnifyingGlass, MapPin, Phone, Users, WarningCircle, X } from '@phosphor-icons/react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

/* ── Skeleton loader for patient cards ─────────────────────────── */
function PatientSkeleton() {
  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-title" style={{ marginBottom: '8px' }} />
          <div className="skeleton skeleton-text sm" style={{ width: '80px' }} />
        </div>
        <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        <div className="skeleton skeleton-text" style={{ width: '50%' }} />
      </div>
    </div>
  );
}

/* ── Validation helpers ─────────────────────────────────────────── */
function validateForm(data) {
  const errors = {};
  if (!data.name.trim()) errors.name = 'Full name is required';
  else if (data.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  const age = parseInt(data.age, 10);
  if (!data.age) errors.age = 'Age is required';
  else if (isNaN(age) || age < 0 || age > 120) errors.age = 'Enter a valid age (0–120)';
  if (!data.village.trim()) errors.village = 'Village/ward is required';
  if (data.phone && !/^[0-9+\-\s()]{7,15}$/.test(data.phone.trim())) {
    errors.phone = 'Enter a valid phone number';
  }
  return errors;
}

export default function Patients() {
  const toast = useToast();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const debounceRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '', age: '', gender: 'MALE', village: '', phone: '', allergies: '',
  });

  /* debounce search */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 380);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.patients.list({ query: debouncedSearch.trim() || undefined, size: 50 });
      setPatients(res.items || []);
    } catch (err) {
      console.error('Failed to load patient registry:', err);
      setError('Failed to load patient records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const resetForm = () => {
    setFormData({ name: '', age: '', gender: 'MALE', village: '', phone: '', allergies: '' });
    setFormErrors({});
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      await api.patients.create({
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        village: formData.village.trim(),
        phone: formData.phone.trim() || undefined,
        allergies: formData.allergies.trim() || undefined,
      });
      setShowModal(false);
      resetForm();
      await loadPatients();
      toast.success('Patient registered successfully.', 'Patient Added');
    } catch (err) {
      toast.error(err.message || 'Could not register patient. Please try again.', 'Registration Failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="module-view">
      {/* Header */}
      <header className="module-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Patient Registry</h2>
          <p className="subtitle">Centralized citizen health profiles, UHID assignment, and allergy records.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ flexShrink: 0 }}>
          <UserPlus size={16} weight="bold" /> Register Patient
        </button>
      </header>

      {/* Search */}
      <div className="glass-panel" style={{ padding: '14px 16px' }}>
        <div className="input-icon-wrapper">
          <MagnifyingGlass size={16} />
          <input
            type="search"
            placeholder="Search by name, UHID, village or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search patients"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid-2">
          {Array.from({ length: 6 }).map((_, i) => <PatientSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="glass-panel">
          <div className="error-state">
            <div className="error-state-icon"><WarningCircle size={24} /></div>
            <h3>Could not load patients</h3>
            <p>{error}</p>
            <button className="btn-secondary" onClick={loadPatients}>Try Again</button>
          </div>
        </div>
      ) : patients.length === 0 ? (
        <div className="glass-panel">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={28} /></div>
            <h3>{debouncedSearch ? 'No matching patients' : 'No patients registered yet'}</h3>
            <p>{debouncedSearch ? 'Try a different search term.' : 'Register your first patient to get started.'}</p>
            {!debouncedSearch && (
              <button className="btn-primary btn-sm" onClick={() => setShowModal(true)}>
                <UserPlus size={14} /> Register Patient
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-8px' }}>
            {patients.length} patient{patients.length !== 1 ? 's' : ''} found
          </div>
          <div className="grid-2">
            {patients.map((p) => (
              <PatientCard key={p.id} patient={p} />
            ))}
          </div>
        </>
      )}

      {/* Register Patient Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <h3 className="modal-title" id="modal-title">Register New Patient</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Full name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="pt-name">Full Name <span className="required">*</span></label>
                <input
                  id="pt-name" type="text" required
                  placeholder="e.g. Priya Sharma"
                  className={formErrors.name ? 'error' : ''}
                  value={formData.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                />
                {formErrors.name && <div className="field-error">{formErrors.name}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="pt-age">Age <span className="required">*</span></label>
                  <input
                    id="pt-age" type="number" required min="0" max="120"
                    placeholder="e.g. 34"
                    className={formErrors.age ? 'error' : ''}
                    value={formData.age}
                    onChange={e => handleFieldChange('age', e.target.value)}
                  />
                  {formErrors.age && <div className="field-error">{formErrors.age}</div>}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="pt-gender">Gender <span className="required">*</span></label>
                  <select
                    id="pt-gender"
                    value={formData.gender}
                    onChange={e => handleFieldChange('gender', e.target.value)}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="pt-village">Village / Ward <span className="required">*</span></label>
                <input
                  id="pt-village" type="text" required
                  placeholder="e.g. Ward 12, Coimbatore"
                  className={formErrors.village ? 'error' : ''}
                  value={formData.village}
                  onChange={e => handleFieldChange('village', e.target.value)}
                />
                {formErrors.village && <div className="field-error">{formErrors.village}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="pt-phone">Phone Number</label>
                <input
                  id="pt-phone" type="tel"
                  placeholder="e.g. 9876543210"
                  className={formErrors.phone ? 'error' : ''}
                  value={formData.phone}
                  onChange={e => handleFieldChange('phone', e.target.value)}
                />
                {formErrors.phone && <div className="field-error">{formErrors.phone}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="pt-allergies">Known Allergies</label>
                <input
                  id="pt-allergies" type="text"
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  value={formData.allergies}
                  onChange={e => handleFieldChange('allergies', e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientCard({ patient: p }) {
  return (
    <div className="glass-panel card-interactive" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</h3>
          <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontFamily: 'monospace', fontWeight: 600 }}>
            UHID: {p.uhid}
          </span>
        </div>
        <span className="badge badge-primary">{p.gender}, {p.age} yrs</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={13} color="#38bdf8" />
          <span>{p.village || 'Village not recorded'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Phone size={13} color="#34d399" />
          <span>{p.phone || 'Phone not recorded'}</span>
        </div>
        {p.allergies && (
          <div style={{
            marginTop: '8px', padding: '6px 10px',
            background: 'rgba(239,68,68,0.12)', color: '#f87171',
            borderRadius: '8px', fontSize: '12px', fontWeight: 500,
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            🚨 Allergies: {p.allergies}
          </div>
        )}
      </div>
    </div>
  );
}
