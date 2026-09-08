import React, { useState, useEffect } from 'react';
import { UserPlus, MagnifyingGlass, MapPin, Phone } from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'MALE',
    village: '',
    phone: '',
    allergies: '',
  });

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await api.patients.list({ search: search || undefined, size: 50 });
      setPatients(res.items || []);
    } catch (err) {
      console.error('Failed to load patient registry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [search]);

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patients.create({
        name: formData.name,
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        village: formData.village,
        phone: formData.phone.trim() || undefined,
        allergies: formData.allergies.trim() || undefined,
      });
      setShowModal(false);
      setFormData({ name: '', age: '', gender: 'MALE', village: '', phone: '', allergies: '' });
      await loadPatients();
    } catch (err) {
      alert(`Failed to register patient: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="module-view">
      <header className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Patient Registry (Admin Only)</h2>
          <p className="subtitle">Centralized citizen health profile registry, UHID assignment, and allergy records.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} weight="bold" /> Register Patient
        </button>
      </header>

      {/* Search Bar */}
      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <div className="input-icon-wrapper">
          <MagnifyingGlass />
          <input
            type="text"
            placeholder="Search patients by name, UHID, village, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading patient records...</div>
        ) : patients.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No patient records found.</div>
        ) : (
          patients.map((p) => (
            <div key={p.id} className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>{p.name}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--accent-yellow)', fontFamily: 'monospace' }}>UHID: {p.uhid}</span>
                </div>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                  {p.gender}, {p.age} yrs
                </span>
              </div>

              <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="#38bdf8" /> Village/Ward: {p.village || 'N/A'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="#34d399" /> Phone: {p.phone || 'Not recorded'}
                </div>
                {p.allergies && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(239,68,68,0.15)', color: '#f87171', borderRadius: '6px', fontSize: '12px' }}>
                    🚨 Allergies: {p.allergies}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Register Patient */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Register New Patient</h3>
            <form onSubmit={handleCreatePatient} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>FULL NAME *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AGE *</label>
                  <input type="number" required min="0" max="120" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GENDER *</label>
                  <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>VILLAGE / WARD *</label>
                <input type="text" required value={formData.village} onChange={(e) => setFormData({ ...formData, village: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PHONE NUMBER</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>KNOWN ALLERGIES</label>
                <input type="text" placeholder="e.g. Penicillin, Sulfa drugs" value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Registering...' : 'Register Patient'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
