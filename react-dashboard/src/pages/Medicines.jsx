import React, { useState, useEffect } from 'react';
import {
  Pill,
  MagnifyingGlass,
  ShieldWarning,
  Plus,
  Trash,
  CheckCircle,
  FileArrowUp,
  User,
  Warning,
  CaretRight,
} from '@phosphor-icons/react';
import { api } from '../services/api';

export default function Medicines() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'prescribe' | 'interactions'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Prescription creation state
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [prescriberName, setPrescriberName] = useState('Dr. S. Mukherjee, MBBS');
  const [prescriptionItems, setPrescriptionItems] = useState([
    { medicine_name: 'Paracetamol', dosage: '650mg', frequency: 'TDS (Thrice daily)', duration_days: 5 },
  ]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [savingPrescription, setSavingPrescription] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Drug Interaction checker state
  const [checkMeds, setCheckMeds] = useState('Ibuprofen, Aspirin');
  const [checkPatientId, setCheckPatientId] = useState('');
  const [interactionReport, setInteractionReport] = useState(null);
  const [checkingSafety, setCheckingSafety] = useState(false);

  useEffect(() => {
    // Load patients
    const loadPatients = async () => {
      try {
        const data = await api.patients.list({ size: 50 });
        setPatients(data.items || []);
        if (data.items && data.items.length > 0) {
          setSelectedPatientId(data.items[0].id);
          setCheckPatientId(data.items[0].id);
        }
      } catch (err) {
        console.error('Error loading patients:', err);
      }
    };
    loadPatients();
    handleSearch('Paracetamol');
  }, []);

  const handleSearch = async (queryToRun) => {
    const q = queryToRun !== undefined ? queryToRun : searchQuery;
    if (!q.trim()) return;
    setSearching(true);
    try {
      const data = await api.medicines.search(q);
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddItem = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      { medicine_name: '', dosage: '500mg', frequency: 'BD (Twice daily)', duration_days: 5 },
    ]);
  };

  const handleRemoveItem = (index) => {
    const updated = [...prescriptionItems];
    updated.splice(index, 1);
    setPrescriptionItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...prescriptionItems];
    updated[index][field] = value;
    setPrescriptionItems(updated);
  };

  const handlePrescribeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      alert('Please select a patient');
      return;
    }
    setSavingPrescription(true);
    setSuccessMsg('');
    setValidationResult(null);

    try {
      const payload = {
        patient_id: selectedPatientId,
        prescriber_name: prescriberName,
        items: prescriptionItems,
        notes: prescriptionNotes,
      };
      const res = await api.medicines.createPrescription(payload);
      if (res.warnings && res.warnings.has_warnings) {
        setValidationResult(res.warnings);
      }
      setSuccessMsg(`Prescription successfully saved (Rx #${res.id.slice(0, 8)})`);
      setPrescriptionItems([
        { medicine_name: '', dosage: '500mg', frequency: 'BD (Twice daily)', duration_days: 5 },
      ]);
    } catch (err) {
      alert('Failed to save prescription: ' + err.message);
    } finally {
      setSavingPrescription(false);
    }
  };

  const handleRunInteractionCheck = async (e) => {
    e.preventDefault();
    setCheckingSafety(true);
    try {
      const medList = checkMeds.split(',').map((m) => m.trim()).filter(Boolean);
      const res = await api.medicines.checkSafety(checkPatientId, medList);
      setInteractionReport(res);
    } catch (err) {
      alert('Safety check failed: ' + err.message);
    } finally {
      setCheckingSafety(false);
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Medicines, Prescriptions & Drug Safety</h2>
        <p className="subtitle">
          Essential medicines formulary, allergy screening, drug-drug interaction warning engine, and prescription issuance.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className={activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('search')}
        >
          Formulary Search
        </button>
        <button
          className={activeTab === 'prescribe' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('prescribe')}
        >
          Issue Prescription
        </button>
        <button
          className={activeTab === 'interactions' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('interactions')}
        >
          Drug Interaction Checker
        </button>
      </div>

      {activeTab === 'search' && (
        <div>
          <div className="glass-panel" style={{ marginBottom: '20px' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={{ display: 'flex', gap: '12px' }}>
              <div className="input-icon-wrapper" style={{ flex: 1 }}>
                <MagnifyingGlass />
                <input
                  type="text"
                  placeholder="Search by generic name, brand (e.g. Paracetamol, Dolo, Amoxicillin, Metformin)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {searchResults.map((med) => (
              <div key={med.id} className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>{med.generic_name}</h3>
                    {med.brand_name && (
                      <span style={{ fontSize: '12px', color: '#93c5fd' }}>Brand: {med.brand_name}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                    {med.category || 'Medicine'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
                  <div><strong>Standard Dosage: </strong>{med.default_dosage || 'As prescribed'}</div>
                  <div><strong>Frequency: </strong>{med.standard_frequency || 'As advised'}</div>
                </div>

                {med.warnings && (
                  <div style={{ fontSize: '12px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(234,179,8,0.1)', color: '#fde047', display: 'flex', gap: '6px' }}>
                    <Warning size={16} style={{ flexShrink: 0 }} />
                    <span>{med.warnings}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'prescribe' && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px' }}>Create Patient Prescription</h3>

            {successMsg && (
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} /> {successMsg}
              </div>
            )}

            <form onSubmit={handlePrescribeSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Select Patient *</label>
                  <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Prescriber Name</label>
                  <input
                    type="text"
                    value={prescriberName}
                    onChange={(e) => setPrescriberName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '13px' }}>Prescription Items</label>
                  <button type="button" className="btn-secondary" onClick={handleAddItem} style={{ fontSize: '12px', padding: '4px 10px' }}>
                    <Plus size={12} /> Add Drug
                  </button>
                </div>

                {prescriptionItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g. Paracetamol)"
                      required
                      value={item.medicine_name}
                      onChange={(e) => handleItemChange(idx, 'medicine_name', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Dosage (500mg)"
                      value={item.dosage}
                      onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Frequency"
                      value={item.frequency}
                      onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                    />
                    {prescriptionItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Prescription Notes & Special Advice</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Take with warm water, complete full antibiotic course."
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={savingPrescription} style={{ width: '100%', padding: '12px' }}>
                {savingPrescription ? 'Screening & Saving...' : 'Verify Safety & Save Prescription'}
              </button>
            </form>
          </div>

          {/* Real-time Safety Warnings Sidebar */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldWarning size={20} color="#f59e0b" /> Prescription Safety Audit
            </h3>

            {!validationResult ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Prescription safety screening occurs automatically during submission, checking for allergy contraindications and harmful drug interactions.
              </p>
            ) : (
              <div>
                {validationResult.allergy_warnings.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#f87171', fontSize: '13px', margin: '0 0 8px 0' }}>🚨 Allergy Contraindications Detected!</h4>
                    {validationResult.allergy_warnings.map((w, i) => (
                      <div key={i} style={{ padding: '10px', background: 'rgba(239,68,68,0.15)', borderLeft: '3px solid #ef4444', borderRadius: '4px', marginBottom: '6px', fontSize: '12px' }}>
                        <strong>{w.drug_name}:</strong> {w.warning_message}
                      </div>
                    ))}
                  </div>
                )}

                {validationResult.drug_interactions.length > 0 && (
                  <div>
                    <h4 style={{ color: '#fb923c', fontSize: '13px', margin: '0 0 8px 0' }}>⚠️ Drug-Drug Interactions Detected!</h4>
                    {validationResult.drug_interactions.map((it, i) => (
                      <div key={i} style={{ padding: '10px', background: 'rgba(249,115,22,0.15)', borderLeft: '3px solid #f97316', borderRadius: '4px', marginBottom: '6px', fontSize: '12px' }}>
                        <strong>{it.drug_a} + {it.drug_b} ({it.severity}):</strong> {it.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'interactions' && (
        <div className="glass-panel" style={{ maxWidth: '700px' }}>
          <h3 style={{ marginBottom: '16px' }}>Interactive Drug Interaction & Allergy Screener</h3>
          <form onSubmit={handleRunInteractionCheck}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Select Patient (checks against documented allergies)</label>
              <select value={checkPatientId} onChange={(e) => setCheckPatientId(e.target.value)}>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (Allergies: {p.allergies || 'None'})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Medications to Screen (comma-separated)</label>
              <input
                type="text"
                value={checkMeds}
                onChange={(e) => setCheckMeds(e.target.value)}
                placeholder="e.g. Ibuprofen, Aspirin, Amoxicillin"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={checkingSafety}>
              {checkingSafety ? 'Checking...' : 'Screen Interactions & Allergies'}
            </button>
          </form>

          {interactionReport && (
            <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              {!interactionReport.has_warnings ? (
                <div style={{ padding: '14px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={20} /> No known severe drug interactions or patient allergy contraindications detected for these medications.
                </div>
              ) : (
                <div>
                  {interactionReport.allergy_warnings.map((aw, i) => (
                    <div key={i} style={{ padding: '12px', background: 'rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '8px', marginBottom: '10px', fontSize: '13px' }}>
                      <strong>ALLERGY ALERT: </strong>{aw.warning_message}
                    </div>
                  ))}
                  {interactionReport.drug_interactions.map((dw, i) => (
                    <div key={i} style={{ padding: '12px', background: 'rgba(249,115,22,0.2)', color: '#fb923c', borderRadius: '8px', marginBottom: '10px', fontSize: '13px' }}>
                      <strong>{dw.drug_a} + {dw.drug_b} ({dw.severity}): </strong>{dw.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
