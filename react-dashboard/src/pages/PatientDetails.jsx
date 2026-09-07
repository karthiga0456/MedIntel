import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  ArrowLeft,
  CalendarBlank,
  ClockCounterClockwise,
  Syringe,
  FileText,
  Pill,
  Heartbeat,
  ShieldWarning,
  MapPin,
  Phone,
  Plus,
  MagnifyingGlass,
  PaperPlaneRight,
} from '@phosphor-icons/react';
import { api } from '../services/api';

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  // New consultation state
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [savingConsult, setSavingConsult] = useState(false);

  // RAG Query state
  const [ragQuery, setRagQuery] = useState('');
  const [ragAnswer, setRagAnswer] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);

  const fetchPatientDetails = async () => {
    setLoading(true);
    try {
      const data = await api.patients.get(id);
      setPatient(data);
      setTimeline(data.timeline || []);
    } catch (err) {
      console.error('Error fetching patient profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [id]);

  const handleAddConsultation = async (e) => {
    e.preventDefault();
    setSavingConsult(true);
    try {
      await api.patients.addConsultation(id, {
        chief_complaint: complaint,
        diagnosis,
        notes,
      });
      setShowConsultModal(false);
      setComplaint('');
      setDiagnosis('');
      setNotes('');
      fetchPatientDetails();
    } catch (err) {
      alert('Error adding consultation: ' + err.message);
    } finally {
      setSavingConsult(false);
    }
  };

  const handleRunRAG = async (e) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setRagLoading(true);
    try {
      const res = await api.rag.query(ragQuery, id);
      setRagAnswer(res);
    } catch (err) {
      alert('RAG query failed: ' + err.message);
    } finally {
      setRagLoading(false);
    }
  };

  if (loading) {
    return <div className="module-view"><p style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading patient profile...</p></div>;
  }

  if (!patient) {
    return (
      <div className="module-view">
        <button onClick={() => navigate('/dashboard/patients')} className="btn-secondary" style={{ marginBottom: '16px' }}>
          ← Back to Patient Registry
        </button>
        <p>Patient not found.</p>
      </div>
    );
  }

  return (
    <div className="module-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/dashboard/patients')}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
        >
          <ArrowLeft size={16} /> Back to Registry
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={() => setShowConsultModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus weight="bold" /> Log Consultation
          </button>
          <button className="btn-secondary" onClick={() => navigate('/dashboard/labs')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText /> Upload Lab
          </button>
        </div>
      </div>

      {/* Patient Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
            }}
          >
            {patient.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ margin: 0 }}>{patient.name}</h2>
              <span style={{ fontFamily: 'monospace', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>
                {patient.uhid}
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              {patient.age || '—'} yrs • {patient.gender} • Blood Group: {patient.blood_group || '—'} • Village: {patient.village}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '20px',
                fontWeight: 600,
                backgroundColor: patient.vaccination_status === 'fully_vaccinated' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                color: patient.vaccination_status === 'fully_vaccinated' ? '#4ade80' : '#facc15',
              }}
            >
              {patient.vaccination_status ? patient.vaccination_status.replace('_', ' ') : 'Vaccination Status Pending'}
            </span>
          </div>
        </div>

        {/* Clinical Alerts Strip */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <div style={{ fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Allergies: </span>
            <strong style={{ color: patient.allergies ? '#f87171' : '#fff' }}>{patient.allergies || 'No known drug allergies'}</strong>
          </div>
          <div style={{ fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Chronic Conditions: </span>
            <strong>{patient.chronic_conditions || 'None documented'}</strong>
          </div>
          <div style={{ fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Contact: </span>
            <span>{patient.phone || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Grid: Timeline & RAG Assistant */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Longitudinal Medical Record Timeline */}
        <div>
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClockCounterClockwise size={20} color="#38bdf8" /> Medical Record Timeline
            </h3>

            {timeline.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>No timeline events recorded yet.</p>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                {timeline.map((event, idx) => (
                  <div key={event.id || idx} style={{ position: 'relative', marginBottom: '24px' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-31px',
                        top: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor:
                          event.event_type === 'REGISTRATION' ? '#38bdf8' :
                          event.event_type === 'CONSULTATION' ? '#a855f7' :
                          event.event_type === 'PRESCRIPTION' ? '#10b981' :
                          event.event_type === 'LAB_REPORT' ? '#f59e0b' : '#ec4899',
                        boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                      }}
                    />
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {new Date(event.timestamp).toLocaleDateString()} • {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      <span style={{ fontWeight: 600, color: '#94a3b8' }}>{event.event_type}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#fff', marginBottom: '4px' }}>
                      {event.title}
                    </div>
                    <p style={{ margin: 0, color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                      {event.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Grounded Patient RAG Query */}
        <div>
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MagnifyingGlass size={18} color="#818cf8" /> Ask Patient History (RAG)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              AI retrieval strictly isolated to {patient.name}'s uploaded documents.
            </p>

            <form onSubmit={handleRunRAG}>
              <textarea
                rows={3}
                placeholder="e.g. Has this patient had high blood sugar or previous fever episodes?"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                style={{ width: '100%', marginBottom: '10px', fontSize: '13px' }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={ragLoading}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <PaperPlaneRight /> {ragLoading ? 'Searching Documents...' : 'Ask AI'}
              </button>
            </form>

            {ragAnswer && (
              <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                  {ragAnswer.answer}
                </div>
                {ragAnswer.sources && ragAnswer.sources.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Sources: {ragAnswer.sources.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Consultation Modal */}
      {showConsultModal && (
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
            style={{ width: '100%', maxWidth: '500px', background: '#0f172a', padding: '24px' }}
          >
            <h3 style={{ marginBottom: '16px' }}>Log Clinical Consultation</h3>
            <form onSubmit={handleAddConsultation}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Chief Complaint *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute fever and joint pain for 3 days"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Clinical Diagnosis / Assessment</label>
                <input
                  type="text"
                  placeholder="e.g. Suspected Dengue Fever"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Consultation Notes / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Advised complete bed rest, adequate hydration with ORS, follow-up in 48h."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowConsultModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingConsult}>
                  {savingConsult ? 'Saving...' : 'Save Consultation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
