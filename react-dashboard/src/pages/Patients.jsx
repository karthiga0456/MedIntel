import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlass,
  Plus,
  Funnel,
  User,
  Heartbeat,
  Syringe,
  MapPin,
  ClockCounterClockwise,
  ArrowRight,
  ShieldWarning,
  X,
} from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [vaxFilter, setVaxFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    dob: '',
    gender: 'female',
    phone: '',
    address: '',
    village: 'Village A',
    emergency_contact: '',
    blood_group: 'O+',
    allergies: '',
    chronic_conditions: '',
    vaccination_status: 'partially_vaccinated',
  });
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = { page, size: 10 };
      if (search) params.query = search;
      if (villageFilter) params.village = villageFilter;
      if (vaxFilter) params.vaccination_status = vaxFilter;

      const data = await api.patients.list(params);
      setPatients(data.items || []);
      setTotalPages(data.pages || 1);
      setTotalPatients(data.total || 0);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [page, villageFilter, vaxFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPatients();
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg('');
    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age, 10) : null,
      };
      await api.patients.create(payload);
      setShowModal(false);
      setFormData({
        name: '', age: '', dob: '', gender: 'female', phone: '', address: '',
        village: 'Village A', emergency_contact: '', blood_group: 'O+',
        allergies: '', chronic_conditions: '', vaccination_status: 'partially_vaccinated',
      });
      fetchPatients();
    } catch (err) {
      setErrorMsg(err.message || 'Error creating patient');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="module-view">
      <header className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Patient Registry & Health Records</h2>
          <p className="subtitle">Centralized longitudinal patient database with timeline surveillance.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus weight="bold" /> Register Patient
        </button>
      </header>

      {/* Filter & Search Bar */}
      <div className="glass-panel" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
          <div className="input-icon-wrapper">
            <MagnifyingGlass />
            <input
              type="text"
              placeholder="Search by Name, UHID, Village, or Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="input-icon-wrapper select-wrapper">
            <MapPin />
            <select value={villageFilter} onChange={(e) => setVillageFilter(e.target.value)}>
              <option value="">All Villages</option>
              <option value="Village A">Village A</option>
              <option value="Village B">Village B</option>
              <option value="Village C">Village C</option>
              <option value="Sector 4">Sector 4</option>
            </select>
          </div>

          <div className="input-icon-wrapper select-wrapper">
            <Syringe />
            <select value={vaxFilter} onChange={(e) => setVaxFilter(e.target.value)}>
              <option value="">All Vaccination Status</option>
              <option value="fully_vaccinated">Fully Vaccinated</option>
              <option value="partially_vaccinated">Partially Vaccinated</option>
              <option value="unvaccinated">Unvaccinated</option>
            </select>
          </div>

          <button type="submit" className="btn-secondary" style={{ padding: '10px 18px' }}>
            Filter
          </button>
        </form>
      </div>

      {/* Patient List Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading patient records...
          </div>
        ) : patients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <User size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-muted)' }}>No patients found matching your search criteria.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '13px' }}>
                <th style={{ padding: '12px 16px' }}>UHID</th>
                <th style={{ padding: '12px 16px' }}>Patient Name</th>
                <th style={{ padding: '12px 16px' }}>Age/Gender</th>
                <th style={{ padding: '12px 16px' }}>Village</th>
                <th style={{ padding: '12px 16px' }}>Vaccination</th>
                <th style={{ padding: '12px 16px' }}>Allergies</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => navigate(`/dashboard/patients/${p.id}`)}
                >
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#60a5fa', fontWeight: 600 }}>
                    {p.uhid}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {p.age || '—'} yrs • {p.gender || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                      <MapPin size={14} color="#94a3b8" /> {p.village}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: 600,
                        backgroundColor: p.vaccination_status === 'fully_vaccinated' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                        color: p.vaccination_status === 'fully_vaccinated' ? '#4ade80' : '#facc15',
                      }}
                    >
                      {p.vaccination_status ? p.vaccination_status.replace('_', ' ') : 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                    {p.allergies ? (
                      <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldWarning size={14} /> {p.allergies}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>None reported</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/patients/${p.id}`);
                      }}
                    >
                      View Profile <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {patients.length} of {totalPatients} registered patients
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '13px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '28px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Register New Patient</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreatePatient} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Age</label>
                <input
                  type="number"
                  placeholder="e.g. 42"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Village *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Village A"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Blood Group</label>
                <select
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div className="form-group">
                <label>Vaccination Status</label>
                <select
                  value={formData.vaccination_status}
                  onChange={(e) => setFormData({ ...formData, vaccination_status: e.target.value })}
                >
                  <option value="fully_vaccinated">Fully Vaccinated</option>
                  <option value="partially_vaccinated">Partially Vaccinated</option>
                  <option value="unvaccinated">Unvaccinated</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Known Drug Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa drugs, Aspirin"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Chronic Medical Conditions</label>
                <input
                  type="text"
                  placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                  value={formData.chronic_conditions}
                  onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Saving...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
